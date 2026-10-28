import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type Anthropic from "@anthropic-ai/sdk";
import type { AssistantClient, StreamParams } from "@/lib/assistant-server";

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

// The CLI takes about six seconds to start, so one copy is kept started and waiting for its prompt
// (stream-json input), set up for the profile and scope of the last request or warm-up. A copy
// left unused for a while is replaced, so a stale login or update can't linger.
const warmMaxAgeMs = 10 * 60_000;

type Launched = {
  key: string;
  child: ChildProcessWithoutNullStreams;
  workDir: string;
  startedAt: number;
  stderr: () => string;
};

function settingsOf(body: StreamParams) {
  const system = Array.isArray(body.system)
    ? body.system.map((block) => block.text).join("\n\n")
    : (body.system ?? "");
  const thinkingOff = body.thinking?.type === "between_tools";
  const effort = body.output_config?.effort;
  return { system, model: body.model, effort, thinkingOff };
}

function launch(executable: string, body: StreamParams): Launched {
  const settings = settingsOf(body);
  const workDir = mkdtempSync(join(tmpdir(), "dashboard-assistant-"));
  writeFileSync(join(workDir, "system.txt"), settings.system, "utf8");

  // Without ANTHROPIC_API_KEY the CLI uses the signed-in subscription, not API billing.
  const { ANTHROPIC_API_KEY: _apiKey, ...env } = process.env;
  if (settings.thinkingOff) env["MAX_THINKING_TOKENS"] = "0";
  const args = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--tools",
    "",
    "--no-session-persistence",
    "--system-prompt-file",
    "system.txt",
    "--model",
    settings.model,
    ...(settings.effort ? ["--effort", settings.effort] : []),
  ];
  // An empty working folder keeps project files (CLAUDE.md, AGENTS.md) out of the session.
  const child = spawn(executable, args, { cwd: workDir, env, windowsHide: true });
  let errorText = "";
  child.stderr.on("data", (chunk: Buffer) => {
    errorText += chunk.toString();
  });
  return {
    key: JSON.stringify(settings),
    child,
    workDir,
    startedAt: Date.now(),
    stderr: () => errorText,
  };
}

function removeWorkDir(workDir: string) {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    // Windows refuses while a file is still open; the OS temp cleanup removes it later. A
    // throw here would take down the dev server, since it runs inside an abort handler.
  }
}

// The CLI holds files in its work folder until it exits, so remove the folder after that.
function discard(launched: Launched) {
  if (launched.child.exitCode === null) {
    launched.child.once("exit", () => removeWorkDir(launched.workDir));
    launched.child.kill();
  } else {
    removeWorkDir(launched.workDir);
  }
}

export function claudeCodeClient(executable: string): AssistantClient {
  let waiting: Launched | null = null;
  process.once("exit", () => waiting && discard(waiting));

  const warmUp = (body: StreamParams) => {
    const key = JSON.stringify(settingsOf(body));
    const fresh =
      waiting &&
      waiting.key === key &&
      waiting.child.exitCode === null &&
      Date.now() - waiting.startedAt < warmMaxAgeMs;
    if (fresh) return;
    if (waiting) discard(waiting);
    waiting = launch(executable, body);
  };

  // Hands over the waiting copy if it matches, and starts the next one for the follow-up question.
  const take = (body: StreamParams) => {
    warmUp(body);
    const launched = waiting!;
    waiting = launch(executable, body);
    return launched;
  };

  return {
    warmUp,
    beta: {
      messages: {
        stream(body, options) {
          const launched = take(body);
          const { child } = launched;
          child.stdin.write(
            `${JSON.stringify({ type: "user", message: { role: "user", content: promptFor(body.messages) } })}\n`,
          );

          let stopReason: string | null = null;
          const timer = setTimeout(() => child.kill(), answerTimeoutMs);
          const stop = () => {
            clearTimeout(timer);
            discard(launched);
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
                  // One question per copy: closing its input lets the CLI exit.
                  child.stdin.end();
                }
              }
              if (!answered)
                throw new Error(`Claude Code returned no answer. ${launched.stderr().trim()}`);
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
