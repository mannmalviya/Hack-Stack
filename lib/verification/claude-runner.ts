import { spawn } from "node:child_process";

import {
  verificationPayloadSchema,
  type VerificationPayload,
} from "./schema";

// How long a single project's agent session may run before it is killed.
const CLAUDE_TIMEOUT_MS = 300_000;
const CLAUDE_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
// Read-only tools only. In print mode any tool not on this list is denied
// (never prompted), so the agent can inspect the clone but cannot mutate it.
const ALLOWED_TOOLS = ["Read", "Grep", "Glob"];

export type ParseResult =
  | { ok: true; payload: VerificationPayload }
  | { ok: false; reason: string; raw?: string };

// The model's answer may arrive wrapped in a ```json fence, or with a sentence
// of prose before/after the object, despite instructions to emit JSON only.
// Recover the JSON payload: strip a code fence, else slice from the first "{"
// to the last "}" (our contract is a single top-level object).
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  if (candidate.startsWith("{")) return candidate;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
}

/**
 * Parses the two layers of `claude -p --output-format json` output: the CLI
 * envelope, then the model's JSON answer inside envelope.result. Pure, so it can
 * be exercised with captured fixtures.
 */
export function parseClaudeOutput(stdout: string): ParseResult {
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    return { ok: false, reason: "cli-envelope-not-json", raw: stdout.slice(0, 4_000) };
  }

  if (typeof envelope !== "object" || envelope === null) {
    return { ok: false, reason: "cli-envelope-not-object" };
  }
  const record = envelope as Record<string, unknown>;
  if (record.is_error === true) {
    return { ok: false, reason: "cli-reported-error" };
  }
  if (typeof record.result !== "string") {
    return { ok: false, reason: "cli-result-missing" };
  }

  let inner: unknown;
  try {
    inner = JSON.parse(extractJson(record.result));
  } catch {
    return {
      ok: false,
      reason: "model-output-not-json",
      raw: record.result.slice(0, 4_000),
    };
  }

  const parsed = verificationPayloadSchema.safeParse(inner);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "model-output-schema-mismatch",
      raw: JSON.stringify(inner).slice(0, 4_000),
    };
  }

  return { ok: true, payload: parsed.data };
}

/**
 * Runs `claude -p` inside the clone directory, feeding the prompt over stdin
 * (avoids ARG_MAX with large READMEs), and parses the result. Rejects on a
 * non-zero exit, timeout, or spawn failure so the caller can mark the run failed.
 */
export function runClaudeVerification(
  prompt: string,
  cwd: string,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      [
        "-p",
        "--output-format",
        "json",
        "--allowedTools",
        ...ALLOWED_TOOLS,
      ],
      {
        cwd,
        timeout: CLAUDE_TIMEOUT_MS,
        killSignal: "SIGKILL",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let overflowed = false;

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length + chunk.length > CLAUDE_MAX_OUTPUT_BYTES) {
        overflowed = true;
        child.kill("SIGKILL");
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code, signal) => {
      if (overflowed) {
        reject(new Error("claude output exceeded the size limit"));
        return;
      }
      if (signal) {
        reject(new Error(`claude was killed by ${signal} (likely a timeout)`));
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `claude exited with code ${code}: ${stderr.slice(0, 2_000)}`,
          ),
        );
        return;
      }
      resolve(parseClaudeOutput(stdout));
    });

    child.stdin.end(prompt);
  });
}
