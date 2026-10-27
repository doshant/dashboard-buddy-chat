import { describe, expect, it, vi } from "vitest";
import { findClaudeCode, promptFor } from "@/lib/assistant-claude-code";
import { buildAssistantContext } from "@/lib/assistant-context";
import { assistantInstructions } from "@/lib/assistant-prompt";
import {
  assistantModel,
  buildClaudeRequest,
  handleChatRequest,
  type AssistantClient,
} from "@/lib/assistant-server";
import { profiles } from "@/lib/dashboard-data";

const profile = (name: string) => profiles.find((item) => item.name === name)!;
const nation = { geography: "Nation" as const, period: "Launch to Date" as const };

const chatRequest = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = {
  profileId: "jenny",
  scope: nation,
  messages: [{ role: "user", content: "How are we tracking against forecast?" }],
};

// A stand-in for the Anthropic client that streams the given text in chunks.
function fakeClient(chunks: string[], stopReason = "end_turn") {
  const stream = vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      yield { type: "message_start" } as never;
      for (const text of chunks) {
        yield {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text },
        } as never;
      }
      yield { type: "message_stop" } as never;
    },
    finalMessage: async () => ({ stop_reason: stopReason }),
    abort: () => {},
  }));
  return { client: { beta: { messages: { stream } } } as unknown as AssistantClient, stream };
}

describe("Live assistant data", () => {
  it("only includes the tabs a profile can see", () => {
    const jenny = buildAssistantContext(nation, profile("Jenny").panels);
    expect(jenny.marketAccess).toBeDefined();
    expect(jenny.marketing).toBeDefined();
    expect(jenny.fieldActivity).toBeDefined();
    expect(jenny.restrictedTabs).toEqual([]);

    const jeff = buildAssistantContext(nation, profile("Jeff").panels);
    expect(jeff.marketing).toBeDefined();
    expect(jeff.executiveSummary).toBeDefined();
    expect(jeff.marketAccess).toBeUndefined();
    expect(jeff.fieldActivity).toBeUndefined();
    expect(jeff.outlook.marketAccess).toBeUndefined();
    expect(jeff.restrictedTabs).toEqual(["Market Access", "Field Activity", "What-If Simulator"]);
  });

  it("follows the selected geography and period", () => {
    const northeast = buildAssistantContext(
      { geography: "Northeast", period: "Monthly", month: "Mar" },
      profile("Jenny").panels,
    );
    expect(northeast.scope).toMatchObject({ geography: "Northeast", period: "in March" });
    expect(northeast.salesAndPatients?.monthlyInPeriod.map((row) => row.month)).toEqual(["Mar"]);
  });

  it("asks for the existing answer style, access message and wording rules", () => {
    expect(assistantInstructions).toContain(
      "Open with two or three key points as markdown bullets",
    );
    expect(assistantInstructions).toContain("isn't part of your access");
    expect(assistantInstructions).toContain('Never write "neurologist"');
    expect(assistantInstructions).toContain("| **Total Q3 denials** | **10** | **100%** |");
    expect(assistantInstructions).toContain("end with it as a markdown blockquote");
  });

  it("calls Claude Opus 5.5 with the data cached after the instructions", () => {
    const request = buildClaudeRequest(validBody as never);
    expect(request.model).toBe(assistantModel);
    expect(request.model).toBe("claude-opus-5-5");
    const system = request.system as { text: string; cache_control?: unknown }[];
    expect(system[0]?.text).toBe(assistantInstructions);
    expect(system[1]?.text.startsWith("DATA\n")).toBe(true);
    expect(system[1]?.cache_control).toEqual({ type: "ephemeral" });
  });
});

describe("Chat endpoint", () => {
  it("streams Claude's answer as plain text", async () => {
    const { client, stream } = fakeClient(["**Net sales are $24.5M**", ", 94% of forecast."]);
    const response = await handleChatRequest(chatRequest(validBody), () => client);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("**Net sales are $24.5M**, 94% of forecast.");
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("answers 503 when no API key is configured, so the chat falls back", async () => {
    const response = await handleChatRequest(chatRequest(validBody), () => null);
    expect(response.status).toBe(503);
  });

  it("rejects bad requests before calling Claude", async () => {
    const { client, stream } = fakeClient(["unused"]);
    const unknown = await handleChatRequest(
      chatRequest({ ...validBody, profileId: "eve" }),
      () => client,
    );
    expect(unknown.status).toBe(400);
    const empty = await handleChatRequest(
      chatRequest({ ...validBody, messages: [] }),
      () => client,
    );
    expect(empty.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });

  it("returns 502 when the call fails before any text arrives", async () => {
    const failing = {
      beta: {
        messages: {
          stream: () => ({
            [Symbol.asyncIterator]: () => ({
              next: () => Promise.reject(new Error("authentication failed")),
            }),
            finalMessage: async () => ({ stop_reason: null }),
            abort: () => {},
          }),
        },
      },
    } as unknown as AssistantClient;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleChatRequest(chatRequest(validBody), () => failing);
    expect(response.status).toBe(502);
    spy.mockRestore();
  });
});

describe("Claude Code (local demo) mode", () => {
  it("sends a single question as-is", () => {
    expect(promptFor([{ role: "user", content: "What is our fill rate?" }])).toBe(
      "What is our fill rate?",
    );
  });

  it("writes earlier turns into the prompt so follow-ups keep their context", () => {
    const prompt = promptFor([
      { role: "user", content: "What is our fill rate?" },
      { role: "assistant", content: "**86% of referrals have filled.**" },
      { role: "user", content: "And in the Northeast?" },
    ]);
    expect(prompt).toContain("User: What is our fill rate?");
    expect(prompt).toContain("Assistant: **86% of referrals have filled.**");
    expect(prompt.endsWith("And in the Northeast?")).toBe(true);
  });

  it("uses CLAUDE_CODE_PATH when it is set", () => {
    vi.stubEnv("CLAUDE_CODE_PATH", "C:/tools/claude.exe");
    expect(findClaudeCode()).toBe("C:/tools/claude.exe");
    vi.unstubAllEnvs();
  });
});
