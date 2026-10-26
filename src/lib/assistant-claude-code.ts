import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type Anthropic from "@anthropic-ai/sdk";
import type { AssistantClient } from "@/lib/assistant-server";

// Local demo mode: answers come from the Claude Code CLI on this machine, using the developer's own
// Claude subscription login instead of an API key. Each question runs `claude -p` once with no
// tools, the same instructions and data block as the API mode, and streams its events back. It only
// works where Claude Code is installed and signed in, so it is for presenter-run demos, not hosting.

const answerTimeoutMs = 180_000;

// Uses CLAUDE_CODE_PATH, then `claude` on PATH, then the copy bundled with the VS Code extension.
export function findClaudeCode(): string | null {
  if (process.env["CLAUDE_CODE_PATH"]) return process.env["CLAUDE_CODE_PATH"];
  const pathDirs = (process.env["PATH"] ?? "").split(process.platform === "win32" ? ";" : ":");
  const names = process.platform === "win32" ? ["claude.exe", "claude.cmd"] : ["claude"];
  for (const dir of pathDirs) {
    for (const name of names) {
      if (dir && existsSync(join(dir, name))) return join(dir, name);
    }
  }
  const extensions = join(homedir(), ".vscode", "extensions");
  if (!existsSync(extensions)) return null;
  const bundled = readdirSync(extensions)
    .filter((name) => name.startsWith("anthropic.claude-code-"))
    .sort()
    .reverse()
    .map((name) =>
      join(
        extensions,
        name,
        "resources",
        "native-binary",
        process.platform === "win32" ? "claude.exe" : "claude",
      ),
    )
    .find((path) => existsSync(path));
  return bundled ?? null;
}

const textOf = (content: Anthropic.Beta.BetaMessageParam["content"] | undefined) =>
  content === undefined
    ? ""
    : typeof content === "string"
      ? content
      : content.map((block) => ("text" in block ? block.text : "")).join("");

// `claude -p` takes one prompt, so earlier turns are written into it as context.
export function promptFor(messages: Anthropic.Beta.BetaMessageParam[]) {
  const question = textOf(messages.at(-1)?.content ?? "");
  const earlier = messages.slice(0, -1);
  if (!earlier.length) return question;
  const transcript = earlier
    .map(
      (message) => `${message.role === "user" ? "User" : "Assistant"}: ${textOf(message.content)}`,
    )
    .join("\n\n");
  return `Conversation so far:\n\n${transcript}\n\nAnswer the user's latest question:\n${question}`;
}

export function claudeCodeClient(executable: string): AssistantClient {
  return {
    beta: {
      messages: {
        stream(body, options) {
          const workDir = mkdtempSync(join(tmpdir(), "dashboard-assistant-"));
          const system = Array.isArray(body.system)
            ? body.system.map((block) => block.text).join("\n\n")
            : (body.system ?? "");
          writeFileSync(join(workDir, "system.txt"), system, "utf8");

          // Without ANTHROPIC_API_KEY the CLI uses the signed-in subscription, not API billing.
          const { ANTHROPIC_API_KEY: _apiKey, ...env } = process.env;
          const args = [
            "-p",
            "--output-format",
            "stream-json",
            "--verbose",
            "--include-partial-messages",
            "--tools",
            "",
            "--no-session-persistence",
            "--system-prompt-file",
            "system.txt",
            ...(body.output_config?.effort ? ["--effort", body.output_config.effort] : []),
          ];
          // An empty working folder keeps project files (CLAUDE.md, AGENTS.md) out of the session.
          const child = spawn(executable, args, { cwd: workDir, env, windowsHide: true });
          child.stdin.end(promptFor(body.messages));

          let stopReason: string | null = null;
          let errorText = "";
          child.stderr.on("data", (chunk: Buffer) => {
            errorText += chunk.toString();
          });
          const timer = setTimeout(() => child.kill(), answerTimeoutMs);
          const stop = () => {
            clearTimeout(timer);
            if (child.exitCode === null) child.kill();
            rmSync(workDir, { recursive: true, force: true });
          };
          options?.signal?.addEventListener("abort", stop, { once: true });

          async function* events(): AsyncGenerator<Anthropic.Beta.BetaRawMessageStreamEvent> {
            let answered = false;
            try {
              for await (const line of createInterface({ input: child.stdout })) {
                if (!line.trim()) continue;
                const item = JSON.parse(line) as {
                  type: string;
                  event?: Anthropic.Beta.BetaRawMessageStreamEvent;
                  is_error?: boolean;
                  result?: string;
                  stop_reason?: string | null;
                };
                if (item.type === "stream_event" && item.event) {
                  if (item.event.type === "message_delta")
                    stopReason = item.event.delta.stop_reason ?? stopReason;
                  if (item.event.type === "content_block_delta") answered = true;
                  yield item.event;
                } else if (item.type === "result") {
                  if (item.is_error)
                    throw new Error(`Claude Code: ${item.result ?? "request failed"}`);
                  stopReason = item.stop_reason ?? stopReason;
                }
              }
              if (!answered) throw new Error(`Claude Code returned no answer. ${errorText.trim()}`);
            } finally {
              stop();
            }
          }

          const iterator = events();
          return {
            [Symbol.asyncIterator]: () => iterator,
            finalMessage: async () => ({ stop_reason: stopReason }),
            abort: stop,
          };
        },
      },
    },
  };
}
