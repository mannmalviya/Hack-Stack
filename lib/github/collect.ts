import type { GithubClient } from "./client";
import { classifyRepositoryFile, shouldIndexRepositoryPath } from "./files";
import {
  isSupportedDependencyManifest,
  parseDependencyManifest,
  type ParsedDependency,
} from "./manifests";

const MAX_MANIFEST_BYTES = 1024 * 1024;

const COMMIT_HISTORY_QUERY = `
  query RepositoryCommitHistory(
    $owner: String!
    $name: String!
    $expression: String!
    $cursor: String
  ) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Commit {
          oid
          history(first: 100, after: $cursor) {
            nodes {
              oid
              message
              authoredDate
              committedDate
              additions
              deletions
              changedFilesIfAvailable
              parents(first: 10) { nodes { oid } }
              author {
                name
                email
                user { databaseId login }
              }
              authors(first: 100) {
                totalCount
                nodes {
                  name
                  email
                  user { databaseId login }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  }
`;

type CommitHistoryResponse = {
  repository: {
    object: {
      oid: string;
      history: {
        nodes: Array<{
          oid: string;
          message: string;
          authoredDate: string;
          committedDate: string;
          additions: number;
          deletions: number;
          changedFilesIfAvailable: number | null;
          parents: { nodes: Array<{ oid: string }> };
          author: {
            name: string | null;
            email: string | null;
            user: { databaseId: number | string | null; login: string } | null;
          } | null;
          authors?: {
            totalCount: number;
            nodes: Array<{
              name: string | null;
              email: string | null;
              user: { databaseId: number | string | null; login: string } | null;
            }>;
          };
        }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  } | null;
};

export type CollectedCommitAuthor = {
  name: string;
  email: string | null;
  githubUserId: number | null;
  githubLogin: string | null;
  isPrimary: boolean;
};

export type CollectedCommit = {
  commitSha: string;
  authorName: string;
  authorEmail: string;
  authorGithubUserId: number | null;
  authorGithubLogin: string | null;
  authoredAt: string;
  committedAt: string;
  message: string;
  parentShas: string[];
  additions: number;
  deletions: number;
  changedFiles: number | null;
  authors: CollectedCommitAuthor[];
};

export type CollectedFile = {
  path: string;
  blobSha: string;
  language: string | null;
  sizeBytes: number;
  lineCount: number | null;
  isBinary: boolean;
};

export type CollectedDependency = ParsedDependency & { manifestPath: string };

async function collectCommits(
  client: GithubClient,
  owner: string,
  repo: string,
  expression: string,
) {
  const commits: CollectedCommit[] = [];
  const warnings: string[] = [];
  let cursor: string | null = null;
  let resolvedCommitSha: string | null = null;

  do {
    const result: CommitHistoryResponse = await client.graphql(COMMIT_HISTORY_QUERY, {
      owner,
      name: repo,
      expression,
      cursor,
    });
    const commit = result.repository?.object;
    if (!commit) throw new Error(`Could not resolve ${owner}/${repo}@${expression}`);
    resolvedCommitSha ??= commit.oid;

    for (const node of commit.history.nodes) {
      const githubUserId = node.author?.user?.databaseId;
      const parsedGithubUserId = githubUserId == null ? null : Number(githubUserId);
      const returnedAuthors = node.authors?.nodes?.length
        ? node.authors.nodes
        : node.author
          ? [node.author]
          : [];
      if (node.authors && node.authors.totalCount > node.authors.nodes.length) {
        warnings.push(
          `${node.oid} had more than 100 authors; only the first 100 were stored`,
        );
      }
      const seenAuthors = new Set<string>();
      const authors = returnedAuthors.flatMap((author) => {
        const parsedUserId = author.user?.databaseId == null
          ? null
          : Number(author.user.databaseId);
        const safeUserId = Number.isSafeInteger(parsedUserId) ? parsedUserId : null;
        const name = author.name?.trim() || "Unknown";
        const email = author.email?.trim() || null;
        const identity = safeUserId !== null
          ? `github:${safeUserId}`
          : email
            ? `email:${email.toLowerCase()}`
            : `name:${name.toLowerCase()}`;
        if (seenAuthors.has(identity)) return [];
        seenAuthors.add(identity);
        return [{
          name,
          email,
          githubUserId: safeUserId,
          githubLogin: safeUserId === null ? null : author.user?.login ?? null,
          isPrimary: false,
        } satisfies CollectedCommitAuthor];
      }).map((author, index) => ({ ...author, isPrimary: index === 0 }));
      if (authors.length === 0) {
        authors.push({
          name: "Unknown",
          email: null,
          githubUserId: null,
          githubLogin: null,
          isPrimary: true,
        });
      }
      commits.push({
        commitSha: node.oid,
        authorName: node.author?.name?.trim() || "Unknown",
        authorEmail: node.author?.email?.trim() || "",
        authorGithubUserId: Number.isSafeInteger(parsedGithubUserId)
          ? parsedGithubUserId
          : null,
        authorGithubLogin: node.author?.user?.login ?? null,
        authoredAt: new Date(node.authoredDate).toISOString(),
        committedAt: new Date(node.committedDate).toISOString(),
        message: node.message,
        parentShas: node.parents.nodes.map((parent) => parent.oid),
        additions: node.additions,
        deletions: node.deletions,
        changedFiles: node.changedFilesIfAvailable,
        authors,
      });
    }

    cursor = commit.history.pageInfo.hasNextPage
      ? commit.history.pageInfo.endCursor
      : null;
    if (commit.history.pageInfo.hasNextPage && !cursor) {
      throw new Error("GitHub commit pagination did not return an end cursor");
    }
  } while (cursor);

  if (!resolvedCommitSha) throw new Error(`No commits were found for ${owner}/${repo}`);
  return { commits, resolvedCommitSha, warnings };
}

async function readManifest(
  client: GithubClient,
  owner: string,
  repo: string,
  sha: string,
) {
  const response = await client.rest.git.getBlob({ owner, repo, file_sha: sha });
  if (response.data.encoding !== "base64") {
    throw new Error(`GitHub returned unsupported blob encoding ${response.data.encoding}`);
  }
  return Buffer.from(response.data.content.replaceAll("\n", ""), "base64").toString("utf8");
}

export async function collectGithubRepositoryData(input: {
  client: GithubClient;
  owner: string;
  repo: string;
  defaultBranch: string;
}) {
  const { client, owner, repo, defaultBranch } = input;
  const warnings: string[] = [];
  const { commits, resolvedCommitSha, warnings: commitWarnings } = await collectCommits(
    client,
    owner,
    repo,
    defaultBranch,
  );
  warnings.push(...commitWarnings);
  const treeResponse = await client.rest.git.getTree({
    owner,
    repo,
    tree_sha: resolvedCommitSha,
    recursive: "1",
  });

  const files: CollectedFile[] = [];
  const manifestEntries: Array<{ path: string; sha: string; size: number }> = [];
  let manifestsComplete = true;
  for (const entry of treeResponse.data.tree) {
    if (
      entry.type !== "blob"
      || !entry.path
      || !entry.sha
      || !shouldIndexRepositoryPath(entry.path)
    ) {
      continue;
    }
    const classification = classifyRepositoryFile(entry.path);
    const size = entry.size ?? 0;
    files.push({
      path: entry.path,
      blobSha: entry.sha,
      language: classification.language,
      sizeBytes: size,
      lineCount: null,
      isBinary: classification.isBinary,
    });
    if (isSupportedDependencyManifest(entry.path)) {
      if (size <= MAX_MANIFEST_BYTES) {
        manifestEntries.push({ path: entry.path, sha: entry.sha, size });
      } else {
        manifestsComplete = false;
        warnings.push(`${entry.path} exceeded the manifest size limit`);
      }
    }
  }

  if (treeResponse.data.truncated) {
    warnings.push("GitHub truncated the recursive repository tree");
  }

  const dependenciesByIdentity = new Map<string, CollectedDependency>();
  for (const manifest of manifestEntries) {
    try {
      const content = await readManifest(client, owner, repo, manifest.sha);
      for (const dependency of parseDependencyManifest(manifest.path, content)) {
        const collectedDependency = {
          ...dependency,
          manifestPath: manifest.path,
        };
        const identity = [
          collectedDependency.ecosystem,
          collectedDependency.manifestPath,
          collectedDependency.packageName,
          collectedDependency.dependencyKind,
        ].join("\0");
        dependenciesByIdentity.set(identity, collectedDependency);
      }
    } catch (error) {
      manifestsComplete = false;
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Could not parse ${manifest.path}: ${message}`);
    }
  }

  const dependencies = [...dependenciesByIdentity.values()];

  return {
    commits,
    dependencies,
    files,
    manifestsComplete,
    resolvedCommitSha,
    treeComplete: !treeResponse.data.truncated,
    warnings,
  };
}
