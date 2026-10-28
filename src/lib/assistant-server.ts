import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildAssistantContext } from "@/lib/assistant-context";
import { assistantInstructions } from "@/lib/assistant-prompt";
import { profiles } from "@/lib/dashboard-data";
import { monthNames, regionNames, timePeriods } from "@/lib/scope";

// Server side of the live Dashboard Assistant: validates the chat request, builds the data snapshot
// the user may see, and streams Claude's answer back as plain text. The API key never leaves the
// server. Callers pass the client in, so tests can use a fake one.

// Claude Opus 5.5 by default. ASSISTANT_MODEL=claude-sonnet-5-5 answers in a few seconds rather
// than about twenty: Sonnet 5.5 runs with thinking off, which these data look-ups don't need.
export const defaultAssistantModel = "claude-opus-5-5";
const fastAssistantModel = "claude-sonnet-5-5";

export function assistantModel() {
  return process.env["ASSISTANT_MODEL"] === fastAssistantModel
    ? fastAssistantModel
    : defaultAssistantModel;
}

const requestSchema = z.object({
  profileId: z.string(),
  scope: z.object({
    geography: z.enum(["Nation", ...regionNames]),
    period: z.enum(timePeriods),
    month: z.enum(monthNames).optional(),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(20),
});

export type ChatRequest = z.infer<typeof requestSchema>;

// A warm-up names the profile and scope the next question will use, without a question.
const warmUpSchema = requestSchema.omit({ messages: true }).extend({ warmUp: z.literal(true) });

// The request body `client.beta.messages.stream()` accepts.
export type StreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

type ReplyStream = AsyncIterable<Anthropic.Beta.BetaRawMessageStreamEvent> & {
  finalMessage(): Promise<{ stop_reason: string | null }>;
  abort(): void;
};

export type AssistantClient = {
  beta: {
    messages: {
      stream(body: StreamParams, options?: { signal?: AbortSignal }): ReplyStream;
    };
  };
  // Optional: get ready for a request like this one, so the next answer starts sooner.
  warmUp?(body: StreamParams): void;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export function buildClaudeRequest(chat: ChatRequest): StreamParams {
  const profile = profiles.find((item) => item.id === chat.profileId)!;
  const { month, ...rest } = chat.scope;
  const context = buildAssistantContext(month ? { ...rest, month } : rest, profile.panels);
  const model = assistantModel();
  return {
    model,
    max_tokens: 64000,
    ...(model === fastAssistantModel
      ? { thinking: { type: "between_tools" as const }, output_config: { effort: "low" as const } }
      : { output_config: { effort: "medium" as const } }),
    // If a safety classifier declines, the API re-runs the request on a suitable model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: assistantInstructions },
      // The data block changes with the scope and profile; caching it keeps follow-ups cheap.
      {
        type: "text",
        text: `DATA\n${JSON.stringify(context)}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: chat.messages,
  };
}

export async function handleChatRequest(
  request: Request,
  getClient: () => AssistantClient | null | Promise<AssistantClient | null>,
): Promise<Response> {
  let chat: ChatRequest;
  try {
    const body: unknown = await request.json();
    const warmUp = warmUpSchema.safeParse(body);
    if (warmUp.success) {
      if (!profiles.some((item) => item.id === warmUp.data.profileId)) {
        return json(400, { error: "unknown_profile" });
      }
      const { warmUp: _warmUp, ...rest } = warmUp.data;
      (await getClient())?.warmUp?.(buildClaudeRequest({ ...rest, messages: [] }));
      return new Response(null, { status: 204 });
    }
    chat = requestSchema.parse(body);
  } catch {
    return json(400, { error: "invalid_request" });
  }
  if (!profiles.some((item) => item.id === chat.profileId)) {
    return json(400, { error: "unknown_profile" });
  }
  if (chat.messages.at(-1)?.role !== "user" || chat.messages[0]?.role !== "user") {
    return json(400, { error: "invalid_conversation" });
  }

  const client = await getClient();
  if (!client) return json(503, { error: "not_configured" });

  const stream = client.beta.messages.stream(buildClaudeRequest(chat), { signal: request.signal });
  const events = stream[Symbol.asyncIterator]();

  // Wait for the first event so connection and authentication errors return an error status
  // (the browser then falls back to the preset answer) instead of a broken stream.
  let first: IteratorResult<Anthropic.Beta.BetaRawMessageStreamEvent>;
  try {
    first = await events.next();
  } catch (error) {
    console.error("Dashboard Assistant request failed", error);
    return json(502, { error: "upstream_failed" });
  }

  const encoder = new TextEncoder();
  const textOf = (event: Anthropic.Beta.BetaRawMessageStreamEvent) =>
    event.type === "content_block_delta" && event.delta.type === "text_delta"
      ? event.delta.text
      : "";

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let result = first;
        while (!result.done) {
          const text = textOf(result.value);
          if (text) controller.enqueue(encoder.encode(text));
          result = await events.next();
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "I can't help with that question. Try asking about the dashboard figures.",
            ),
          );
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
