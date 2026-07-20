import assert from "node:assert/strict";
import test from "node:test";

import type { GithubClient } from "../lib/github/client";
import { fetchGithubReadme } from "../lib/github/readme";

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");

function fakeClient(data: unknown, onCall?: (input: unknown) => void) {
  return {
    rest: {
      repos: {
        getReadme: async (input: unknown) => {
          onCall?.(input);
          if (data instanceof Error) throw data;
          return { data };
        },
      },
    },
  } as unknown as GithubClient;
}

const readme = (overrides: Record<string, unknown> = {}) => ({
  path: "README.md",
  encoding: "base64",
  content: encode("# Hello\n"),
  size: 8,
  download_url: "https://raw.githubusercontent.com/acme/widget/main/README.md",
  ...overrides,
});

test("decodes a readme and reports the repo and ref", async () => {
  const result = await fetchGithubReadme(
    "https://github.com/acme/widget",
    fakeClient(readme()),
  );
  assert.deepEqual(result, {
    path: "README.md",
    content: "# Hello\n",
    repoFullName: "acme/widget",
    ref: "main",
  });
});

test("reads the ref correctly for a nested readme path", async () => {
  const result = await fetchGithubReadme(
    "https://github.com/acme/widget",
    fakeClient(readme({
      path: ".github/README.md",
      download_url: "https://raw.githubusercontent.com/acme/widget/trunk/.github/README.md",
    })),
  );
  assert.equal(result?.ref, "trunk");
});

test("falls back to HEAD when no download url is returned", async () => {
  const result = await fetchGithubReadme(
    "https://github.com/acme/widget",
    fakeClient(readme({ download_url: null })),
  );
  assert.equal(result?.ref, "HEAD");
});

test("passes the parsed owner and repo to GitHub", async () => {
  const calls: unknown[] = [];
  await fetchGithubReadme(
    "https://github.com/acme/widget/",
    fakeClient(readme(), (input) => calls.push(input)),
  );
  assert.deepEqual(calls, [{ owner: "acme", repo: "widget" }]);
});

test("returns null without calling GitHub when there is no repository", async () => {
  const calls: unknown[] = [];
  assert.equal(await fetchGithubReadme(null, fakeClient(readme(), (i) => calls.push(i))), null);
  assert.equal(
    await fetchGithubReadme("not a url", fakeClient(readme(), (i) => calls.push(i))),
    null,
  );
  assert.deepEqual(calls, []);
});

test("treats a 404 as a repository with no readme", async () => {
  const notFound = Object.assign(new Error("Not Found"), { status: 404 });
  assert.equal(
    await fetchGithubReadme("https://github.com/acme/widget", fakeClient(notFound)),
    null,
  );
});

test("rethrows transient failures so they are never cached as an absence", async () => {
  const rateLimited = Object.assign(new Error("API rate limit exceeded"), { status: 403 });
  await assert.rejects(
    fetchGithubReadme("https://github.com/acme/widget", fakeClient(rateLimited)),
    /rate limit/,
  );
});

test("returns null for an oversized or unexpectedly encoded readme", async () => {
  assert.equal(
    await fetchGithubReadme(
      "https://github.com/acme/widget",
      fakeClient(readme({ size: 10 * 1024 * 1024 })),
    ),
    null,
  );
  assert.equal(
    await fetchGithubReadme(
      "https://github.com/acme/widget",
      fakeClient(readme({ encoding: "none", content: "" })),
    ),
    null,
  );
});
