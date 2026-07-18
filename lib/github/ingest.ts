import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  githubRepositories,
  projectRepositories,
  repositoryCommits,
  repositoryCommitAuthors,
  repositoryDependencies,
  repositoryFiles,
  repositoryIngestionRuns,
} from "@/db/schema";

import { createGithubClient, type GithubClient } from "./client";
import { collectGithubRepositoryData } from "./collect";
import { parseGithubRepositoryUrl } from "./urls";

const WRITE_BATCH_SIZE = 250;

type IngestableProject = {
  id: string;
  name: string;
  githubUrl: string;
};

export type GithubIngestionResult = {
  projectId: string;
  projectName: string;
  status: "succeeded" | "partial" | "failed";
  repository: string | null;
  commits: number;
  files: number;
  dependencies: number;
  warnings: string[];
  error: string | null;
};

function batches<T>(values: T[]) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += WRITE_BATCH_SIZE) {
    result.push(values.slice(index, index + WRITE_BATCH_SIZE));
  }
  return result;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function repositoryVisibility(value: unknown, isPrivate: boolean) {
  if (value === "public" || value === "private" || value === "internal") return value;
  return isPrivate ? "private" : "public";
}

async function upsertRepositoryLink(
  project: IngestableProject,
  client: GithubClient,
) {
  const coordinates = parseGithubRepositoryUrl(project.githubUrl);
  const response = await client.rest.repos.get({
    owner: coordinates.owner,
    repo: coordinates.repo,
  });
  const repository = response.data;
  if (repository.private || repository.visibility === "internal") {
    throw new Error("Private and internal GitHub repositories are not supported");
  }
  const ownerType = repository.owner.type;
  if (ownerType !== "User" && ownerType !== "Organization") {
    throw new Error(`Unsupported GitHub repository owner type: ${ownerType ?? "unknown"}`);
  }
  if (!repository.created_at || !repository.updated_at) {
    throw new Error("GitHub repository metadata did not include required timestamps");
  }

  const now = new Date().toISOString();
  const parentRepositoryId = "parent" in repository && repository.parent
    ? repository.parent.id
    : null;
  const [storedRepository] = await db
    .insert(githubRepositories)
    .values({
      githubRepositoryId: repository.id,
      githubNodeId: repository.node_id,
      ownerGithubId: repository.owner.id,
      ownerLogin: repository.owner.login,
      ownerType,
      name: repository.name,
      fullName: repository.full_name,
      htmlUrl: repository.html_url,
      defaultBranch: repository.default_branch,
      visibility: repositoryVisibility(repository.visibility, repository.private),
      isFork: repository.fork,
      parentGithubRepositoryId: parentRepositoryId,
      archived: repository.archived,
      disabled: repository.disabled,
      githubCreatedAt: new Date(repository.created_at).toISOString(),
      githubUpdatedAt: new Date(repository.updated_at).toISOString(),
      githubPushedAt: repository.pushed_at
        ? new Date(repository.pushed_at).toISOString()
        : null,
      apiEtag: response.headers.etag ?? null,
      metadataFetchedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: githubRepositories.githubRepositoryId,
      set: {
        githubNodeId: repository.node_id,
        ownerGithubId: repository.owner.id,
        ownerLogin: repository.owner.login,
        ownerType,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        defaultBranch: repository.default_branch,
        visibility: repositoryVisibility(repository.visibility, repository.private),
        isFork: repository.fork,
        parentGithubRepositoryId: parentRepositoryId,
        archived: repository.archived,
        disabled: repository.disabled,
        githubCreatedAt: new Date(repository.created_at).toISOString(),
        githubUpdatedAt: new Date(repository.updated_at).toISOString(),
        githubPushedAt: repository.pushed_at
          ? new Date(repository.pushed_at).toISOString()
          : null,
        apiEtag: response.headers.etag ?? null,
        metadataFetchedAt: now,
        updatedAt: now,
      },
    })
    .returning({ id: githubRepositories.id });

  const [link] = await db
    .insert(projectRepositories)
    .values({
      projectId: project.id,
      repositoryId: storedRepository.id,
      sourceUrl: project.githubUrl,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [projectRepositories.projectId, projectRepositories.repositoryId],
      set: { sourceUrl: project.githubUrl, updatedAt: now },
    })
    .returning({ id: projectRepositories.id });

  return {
    coordinates,
    defaultBranch: repository.default_branch,
    linkId: link.id,
    repositoryName: repository.full_name,
  };
}

async function persistCollectedData(
  projectRepositoryId: number,
  collected: Awaited<ReturnType<typeof collectGithubRepositoryData>>,
) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const batch of batches(collected.commits)) {
      await tx
        .insert(repositoryCommits)
        .values(batch.map((commit) => ({
          projectRepositoryId,
          commitSha: commit.commitSha,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          authorGithubUserId: commit.authorGithubUserId,
          authorGithubLogin: commit.authorGithubLogin,
          authoredAt: commit.authoredAt,
          committedAt: commit.committedAt,
          message: commit.message,
          parentShas: commit.parentShas,
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
        })))
        .onConflictDoUpdate({
          target: [repositoryCommits.projectRepositoryId, repositoryCommits.commitSha],
          set: {
            authorName: sql`excluded.author_name`,
            authorEmail: sql`excluded.author_email`,
            authorGithubUserId: sql`excluded.author_github_user_id`,
            authorGithubLogin: sql`excluded.author_github_login`,
            authoredAt: sql`excluded.authored_at`,
            committedAt: sql`excluded.committed_at`,
            message: sql`excluded.message`,
            parentShas: sql`excluded.parent_shas`,
            additions: sql`excluded.additions`,
            deletions: sql`excluded.deletions`,
            changedFiles: sql`excluded.changed_files`,
          },
        });
    }

    const storedCommits = [];
    for (const batch of batches(collected.commits)) {
      storedCommits.push(...await tx
        .select({ id: repositoryCommits.id, sha: repositoryCommits.commitSha })
        .from(repositoryCommits)
        .where(and(
          eq(repositoryCommits.projectRepositoryId, projectRepositoryId),
          inArray(repositoryCommits.commitSha, batch.map((commit) => commit.commitSha)),
        )));
    }
    const commitIdBySha = new Map(storedCommits.map((commit) => [commit.sha, commit.id]));
    for (const batch of batches(storedCommits)) {
      await tx
        .delete(repositoryCommitAuthors)
        .where(inArray(
          repositoryCommitAuthors.repositoryCommitId,
          batch.map((commit) => commit.id),
        ));
    }
    const authorRows = collected.commits.flatMap((commit) => {
      const repositoryCommitId = commitIdBySha.get(commit.commitSha);
      if (repositoryCommitId === undefined) {
        throw new Error(`Stored commit ${commit.commitSha} could not be resolved`);
      }
      return commit.authors.map((author, authorPosition) => ({
        repositoryCommitId,
        authorPosition,
        isPrimary: author.isPrimary,
        authorName: author.name,
        authorEmail: author.email,
        authorGithubUserId: author.githubUserId,
        authorGithubLogin: author.githubLogin,
      }));
    });
    for (const batch of batches(authorRows)) {
      await tx.insert(repositoryCommitAuthors).values(batch);
    }

    for (const batch of batches(collected.files)) {
      await tx
        .insert(repositoryFiles)
        .values(batch.map((file) => ({
          projectRepositoryId,
          ...file,
          indexedCommitSha: collected.resolvedCommitSha,
          updatedAt: now,
        })))
        .onConflictDoUpdate({
          target: [repositoryFiles.projectRepositoryId, repositoryFiles.path],
          set: {
            blobSha: sql`excluded.blob_sha`,
            indexedCommitSha: sql`excluded.indexed_commit_sha`,
            language: sql`excluded.language`,
            sizeBytes: sql`excluded.size_bytes`,
            lineCount: sql`excluded.line_count`,
            isBinary: sql`excluded.is_binary`,
            updatedAt: now,
          },
        });
    }
    if (collected.treeComplete) {
      await tx.delete(repositoryFiles).where(and(
        eq(repositoryFiles.projectRepositoryId, projectRepositoryId),
        ne(repositoryFiles.indexedCommitSha, collected.resolvedCommitSha),
      ));
    }

    for (const batch of batches(collected.dependencies)) {
      await tx
        .insert(repositoryDependencies)
        .values(batch.map((dependency) => ({
          projectRepositoryId,
          ...dependency,
          indexedCommitSha: collected.resolvedCommitSha,
          updatedAt: now,
        })))
        .onConflictDoUpdate({
          target: [
            repositoryDependencies.projectRepositoryId,
            repositoryDependencies.ecosystem,
            repositoryDependencies.manifestPath,
            repositoryDependencies.packageName,
            repositoryDependencies.dependencyKind,
          ],
          set: {
            versionConstraint: sql`excluded.version_constraint`,
            indexedCommitSha: sql`excluded.indexed_commit_sha`,
            updatedAt: now,
          },
        });
    }
    if (collected.manifestsComplete && collected.treeComplete) {
      await tx.delete(repositoryDependencies).where(and(
        eq(repositoryDependencies.projectRepositoryId, projectRepositoryId),
        ne(repositoryDependencies.indexedCommitSha, collected.resolvedCommitSha),
      ));
    }
  });
}

export async function ingestProjectGithubRepository(
  project: IngestableProject,
  client: GithubClient = createGithubClient(),
): Promise<GithubIngestionResult> {
  let runId: number | null = null;
  let repositoryName: string | null = null;
  try {
    const linked = await upsertRepositoryLink(project, client);
    repositoryName = linked.repositoryName;
    const now = new Date().toISOString();
    const [run] = await db
      .insert(repositoryIngestionRuns)
      .values({
        projectRepositoryId: linked.linkId,
        requestedRef: linked.defaultBranch,
      })
      .returning({ id: repositoryIngestionRuns.id });
    runId = run.id;
    await db
      .update(repositoryIngestionRuns)
      .set({ status: "running", startedAt: now, updatedAt: now })
      .where(eq(repositoryIngestionRuns.id, runId));

    const collected = await collectGithubRepositoryData({
      client,
      owner: linked.coordinates.owner,
      repo: linked.coordinates.repo,
      defaultBranch: linked.defaultBranch,
    });
    await persistCollectedData(linked.linkId, collected);

    const completedAt = new Date().toISOString();
    const status = collected.warnings.length > 0 ? "partial" : "succeeded";
    await db
      .update(repositoryIngestionRuns)
      .set({
        status,
        resolvedCommitSha: collected.resolvedCommitSha,
        completedAt,
        errorDetail: collected.warnings.length > 0
          ? collected.warnings.join("\n").slice(0, 4000)
          : null,
        updatedAt: completedAt,
      })
      .where(eq(repositoryIngestionRuns.id, runId));

    return {
      projectId: project.id,
      projectName: project.name,
      status,
      repository: repositoryName,
      commits: collected.commits.length,
      files: collected.files.length,
      dependencies: collected.dependencies.length,
      warnings: collected.warnings,
      error: null,
    };
  } catch (error) {
    const message = errorMessage(error);
    if (runId !== null) {
      const completedAt = new Date().toISOString();
      await db
        .update(repositoryIngestionRuns)
        .set({
          status: "failed",
          completedAt,
          errorDetail: message.slice(0, 4000),
          updatedAt: completedAt,
        })
        .where(eq(repositoryIngestionRuns.id, runId));
    }
    return {
      projectId: project.id,
      projectName: project.name,
      status: "failed",
      repository: repositoryName,
      commits: 0,
      files: 0,
      dependencies: 0,
      warnings: [],
      error: message,
    };
  }
}

export async function ingestProjectGithubRepositories(
  projects: IngestableProject[],
  options: {
    concurrency?: number;
    onProjectComplete?: (result: GithubIngestionResult) => void | Promise<void>;
  } = {},
) {
  if (projects.length === 0) return [];
  const concurrency = options.concurrency ?? 2;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("GitHub ingestion concurrency must be between 1 and 4");
  }
  let client: GithubClient;
  try {
    client = createGithubClient();
  } catch (error) {
    const message = errorMessage(error);
    const results = projects.map((project) => {
      const result: GithubIngestionResult = {
        projectId: project.id,
        projectName: project.name,
        status: "failed",
        repository: null,
        commits: 0,
        files: 0,
        dependencies: 0,
        warnings: [],
        error: message,
      };
      return result;
    });
    await Promise.all(results.map((result) => options.onProjectComplete?.(result)));
    return results;
  }
  const results = new Array<GithubIngestionResult>(projects.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < projects.length) {
      const index = nextIndex;
      nextIndex += 1;
      const result = await ingestProjectGithubRepository(projects[index], client);
      results[index] = result;
      await options.onProjectComplete?.(result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, projects.length) }, () => worker()),
  );
  return results;
}
