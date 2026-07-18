import assert from "node:assert/strict";
import test from "node:test";

import type { GithubClient } from "../lib/github/client";
import { collectGithubRepositoryData } from "../lib/github/collect";

test("collects paginated commits, files, and manifest dependencies", async () => {
  const cursors: Array<string | null> = [];
  const fakeClient = {
    graphql: async (_query: string, variables: { cursor: string | null }) => {
      cursors.push(variables.cursor);
      const secondPage = variables.cursor === "page-2";
      return {
        repository: {
          object: {
            oid: "head-sha",
            history: {
              nodes: [{
                oid: secondPage ? "commit-1" : "commit-2",
                message: secondPage ? "First" : "Second",
                authoredDate: "2026-01-01T00:00:00Z",
                committedDate: "2026-01-01T00:00:01Z",
                additions: secondPage ? 5 : 8,
                deletions: secondPage ? 1 : 2,
                changedFilesIfAvailable: 1,
                parents: { nodes: secondPage ? [] : [{ oid: "commit-1" }] },
                author: {
                  name: "Alex",
                  email: "alex@example.com",
                  user: { databaseId: 42, login: "alex" },
                },
                authors: {
                  totalCount: secondPage ? 2 : 1,
                  nodes: [
                    {
                      name: "Alex",
                      email: "alex@example.com",
                      user: { databaseId: 42, login: "alex" },
                    },
                    ...(secondPage ? [{
                      name: "Sam",
                      email: "sam@example.com",
                      user: { databaseId: 84, login: "sam" },
                    }] : []),
                  ],
                },
              }],
              pageInfo: {
                hasNextPage: !secondPage,
                endCursor: secondPage ? null : "page-2",
              },
            },
          },
        },
      };
    },
    rest: {
      git: {
        getTree: async () => ({
          data: {
            truncated: false,
            tree: [
              { type: "blob", path: "src/index.ts", sha: "blob-source", size: 120 },
              { type: "blob", path: "package.json", sha: "blob-package", size: 80 },
              { type: "blob", path: "node_modules/ignored.js", sha: "blob-ignored", size: 10 },
            ],
          },
        }),
        getBlob: async () => ({
          data: {
            encoding: "base64",
            content: Buffer.from(JSON.stringify({
              dependencies: { octokit: "5.0.5" },
            })).toString("base64"),
          },
        }),
      },
    },
  } as unknown as GithubClient;

  const collected = await collectGithubRepositoryData({
    client: fakeClient,
    owner: "acme",
    repo: "example",
    defaultBranch: "main",
  });

  assert.deepEqual(cursors, [null, "page-2"]);
  assert.equal(collected.resolvedCommitSha, "head-sha");
  assert.equal(collected.commits.length, 2);
  assert.deepEqual(collected.commits[0].authors, [{
    name: "Alex",
    email: "alex@example.com",
    githubUserId: 42,
    githubLogin: "alex",
    isPrimary: true,
  }]);
  assert.equal(collected.commits[1].authors.length, 2);
  assert.equal(collected.commits[1].authors[1].githubLogin, "sam");
  assert.deepEqual(collected.files.map((file) => file.path), ["src/index.ts", "package.json"]);
  assert.deepEqual(collected.dependencies, [{
    ecosystem: "npm",
    packageName: "octokit",
    versionConstraint: "5.0.5",
    dependencyKind: "runtime",
    manifestPath: "package.json",
  }]);
  assert.equal(collected.treeComplete, true);
  assert.equal(collected.manifestsComplete, true);
  assert.deepEqual(collected.warnings, []);
});
