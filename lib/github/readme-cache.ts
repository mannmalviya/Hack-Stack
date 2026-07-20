import "server-only";

import { unstable_cache } from "next/cache";

import { fetchGithubReadme } from "./readme";

/**
 * Kept apart from `./readme` so the fetch logic stays importable outside a
 * server component (notably by tests), while anything that reads GITHUB_TOKEN
 * stays behind the `server-only` guard.
 */
const cachedFetch = unstable_cache(fetchGithubReadme, ["github-readme"], {
  revalidate: 3600,
});

/**
 * Time-cached readme lookup for page rendering. The project page is
 * `force-dynamic`, so without a cache every view would spend a GitHub API call
 * (5k/hour on a token) re-fetching a readme that rarely changes.
 *
 * The catch sits *outside* the cache deliberately: a thrown transient failure
 * is never written to the cache, so a momentary rate limit blanks the readme
 * for one render rather than for the whole revalidate window. A genuine "no
 * readme" returns null from inside and is cached normally.
 */
export async function getGithubReadme(githubUrl: string | null) {
  try {
    return await cachedFetch(githubUrl);
  } catch (error) {
    console.error(`Readme fetch failed for ${githubUrl}:`, error);
    return null;
  }
}
