import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { handleChatRequest, type AssistantClient } from "@/lib/assistant-server";

// /api/chat: the live Dashboard Assistant.
// - Local development (`npm run dev`): with ASSISTANT_BACKEND=claude-code in .env.local, answers
//   come from the Claude Code CLI using the presenter's own Claude subscription.
// - Deployed (Vercel etc.): Claude Code is never used, and isn't even bundled. Answers come from
//   the Claude API only if ANTHROPIC_API_KEY is set; otherwise the chat uses its preset answers.
// GET reports which of these applies so the chat can skip live requests in preset mode.

type AssistantMode = "claude-code" | "api" | "preset";

let apiClient: Anthropic | undefined;
let localClient: AssistantClient | null | undefined;

function loadLocalEnv() {
  // Local development: settings live in .env.local (git-ignored, so never deployed).
  if (typeof process.loadEnvFile !== "function") return;
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local: settings must come from the environment.
  }
}

function assistantMode(): AssistantMode {
  if (import.meta.env.DEV) {
    if (!process.env["ASSISTANT_BACKEND"] && !process.env["ANTHROPIC_API_KEY"]) loadLocalEnv();
    if (process.env["ASSISTANT_BACKEND"] === "claude-code") return "claude-code";
  }
  return process.env["ANTHROPIC_API_KEY"] ? "api" : "preset";
}

async function getClient(): Promise<AssistantClient | null> {
  const mode = assistantMode();
  if (mode === "claude-code" && import.meta.env.DEV) {
    if (localClient === undefined) {
      // Loaded only in development, so production builds never include process spawning.
      const { claudeCodeClient, findClaudeCode } = await import("@/lib/assistant-claude-code");
      const executable = findClaudeCode();
      if (!executable)
        console.error("ASSISTANT_BACKEND=claude-code, but the Claude Code CLI wasn't found.");
      localClient = executable ? claudeCodeClient(executable) : null;
    }
    return localClient;
  }
  if (mode === "api") {
    apiClient ??= new Anthropic();
    return apiClient;
  }
  return null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ mode: assistantMode() }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
      POST: ({ request }) => handleChatRequest(request, getClient),
    },
  },
});
