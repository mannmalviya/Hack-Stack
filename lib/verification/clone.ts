import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { parseGithubRepositoryUrl } from "../github/urls";

const run = promisify(execFile);

const CLONE_TIMEOUT_MS = 120_000;
const GIT_MAX_BUFFER = 16 * 1024 * 1024;
// READMEs are fed verbatim into the prompt, so refuse anything unreasonable.
const MAX_README_BYTES = 512 * 1024;

export type RepoClone = {
  dir: string;
  resolvedCommitSha: string;
  cleanup: () => Promise<void>;
};

// git echoes the remote URL in its error output; the authenticated form embeds
// the token, so scrub it before anything reaches a log or an errorDetail column.
function scrubToken(message: string, token: string | undefined): string {
  let scrubbed = message;
  if (token) scrubbed = scrubbed.replaceAll(token, "***");
  return scrubbed.replace(
    /https:\/\/x-access-token:[^@\s]+@/g,
    "https://x-access-token:***@",
  );
}

/**
 * Shallow-clones a GitHub repository into a fresh temp directory. Returns the
 * clone directory, the resolved HEAD sha, and a cleanup function that removes
 * the directory. The caller MUST invoke cleanup (in a finally) on every path.
 *
 * Throws when the URL is not a parseable GitHub repository URL or the clone
 * fails; the thrown message never contains the access token.
 */
export async function cloneRepo(
  sourceUrl: string,
  token: string | undefined,
): Promise<RepoClone> {
  // Validate and canonicalize before doing anything with credentials.
  const { owner, repo } = parseGithubRepositoryUrl(sourceUrl);
  const cloneUrl = token
    ? `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;

  const dir = await mkdtemp(path.join(os.tmpdir(), "hackstack-verify-"));
  const cleanup = () => rm(dir, { recursive: true, force: true });

  try {
    await run(
      "git",
      ["clone", "--depth", "1", "--single-branch", cloneUrl, dir],
      { timeout: CLONE_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER },
    );
    const { stdout } = await run("git", ["-C", dir, "rev-parse", "HEAD"], {
      timeout: 10_000,
    });
    return { dir, resolvedCommitSha: stdout.trim(), cleanup };
  } catch (error) {
    await cleanup();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git clone failed: ${scrubToken(message, token)}`);
  }
}

/**
 * Reads a top-level README from a clone (case-insensitive, first match wins).
 * Returns null when absent or oversized, mirroring fetchGithubReadme's contract.
 */
export async function readCloneReadme(dir: string): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  const readme = entries.find((name) => /^readme(\.|$)/i.test(name));
  if (!readme) return null;

  try {
    const buffer = await readFile(path.join(dir, readme));
    if (buffer.byteLength > MAX_README_BYTES) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}
