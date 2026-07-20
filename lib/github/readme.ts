import { createGithubClient, type GithubClient } from "./client";
import { parseGithubRepositoryUrl } from "./urls";

export type FetchedReadme = {
  /** Repository-relative path, e.g. "README.md". */
  path: string;
  content: string;
  /** owner/repo, used to resolve relative links and images. */
  repoFullName: string;
  /** Branch or commit the readme was served from. */
  ref: string;
};

/** Readmes are rendered verbatim, so refuse anything unreasonably large. */
const MAX_README_BYTES = 512 * 1024;

/**
 * Reads a repository's readme straight from GitHub. `repos.getReadme` performs
 * GitHub's own resolution (README.md, README.rst, .github/README.md, ...), so
 * what renders here matches what the repository page shows.
 *
 * Returns null when the readme is genuinely absent (no repo link, unparseable
 * URL, 404, oversized), which is a normal state for a submission.
 *
 * Throws on transient failures (rate limit, auth, network) so callers can tell
 * "this project has no readme" from "we could not look right now" — caching the
 * two identically would hide a real readme for as long as the cache lives.
 */
export async function fetchGithubReadme(
  githubUrl: string | null,
  client?: GithubClient,
): Promise<FetchedReadme | null> {
  if (!githubUrl) return null;

  let owner: string;
  let repo: string;
  try {
    ({ owner, repo } = parseGithubRepositoryUrl(githubUrl));
  } catch {
    return null;
  }

  try {
    const github = client ?? createGithubClient();
    const response = await github.rest.repos.getReadme({ owner, repo });
    const data = response.data;
    if (data.encoding !== "base64" || !data.content) return null;
    if (data.size > MAX_README_BYTES) return null;

    return {
      path: data.path,
      content: Buffer.from(data.content.replaceAll("\n", ""), "base64").toString("utf8"),
      repoFullName: `${owner}/${repo}`,
      // download_url looks like
      // https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>
      ref: data.download_url?.split("/").at(5) ?? "HEAD",
    };
  } catch (error) {
    // A 404 is the ordinary "this repository has no readme" answer.
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}
