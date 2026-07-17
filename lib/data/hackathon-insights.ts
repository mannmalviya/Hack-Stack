import "server-only";

import {
  and,
  asc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  hackathons,
  projectRepositories,
  projects,
  repositoryCommits,
  repositoryDependencies,
  repositoryFiles,
} from "@/db/schema";
import {
  detectAgentsFromCommitMetadata,
  detectAgentsFromRepositoryPath,
  median,
  normalizeClaimedTechnology,
  normalizeDetectedLanguage,
  RECOGNIZED_DEPENDENCY_PACKAGES,
  summarizeAgentSignals,
  summarizeCodebaseSizes,
  summarizeTechnologyUsage,
  technologyFromDependency,
  type AgentSignalUsage,
  type ProjectCodebaseSize,
  type TechnologyUsage,
} from "@/lib/insights/hackathon-analytics";
import { getIsProjectIndexed } from "@/lib/index-coverage";

export type HackathonInsightCoverage = {
  availableProjectCount: number | null;
  indexedProjectCount: number;
  githubLinkedProjects: number;
  usableRepositoryProjects: number;
  partialIngestionProjects: number;
  failedIngestionProjects: number;
  totalSourceBytes: number;
};

export type FailedProjectInsight = {
  name: string;
  slug: string;
  githubUrl: string | null;
  reason: string | null;
};

export type HackathonInsights = {
  coverage: HackathonInsightCoverage;
  languages: TechnologyUsage[];
  technologies: TechnologyUsage[];
  agentSignals: AgentSignalUsage[];
  codebaseSizes: ProjectCodebaseSize[];
  medianCodebaseSizeBytes: number;
  projectsWithoutSourceData: number;
  failedProjects: FailedProjectInsight[];
};

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getHackathonInsights(slug: string): Promise<HackathonInsights> {
  const [allProjectRows, hackathonRow] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.devpostSlug,
        githubUrl: projects.githubUrl,
        builtWithData: projects.builtWithData,
        ingestionStatus: projects.ingestionStatus,
        ingestionCompletedAt: projects.ingestionCompletedAt,
        ingestionError: projects.ingestionError,
      })
      .from(projects)
      .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
      .where(eq(hackathons.devpostSlug, slug))
      .orderBy(asc(projects.name)),
    db
      .select({
        availableProjectCount: hackathons.projectCount,
      })
      .from(hackathons)
      .where(eq(hackathons.devpostSlug, slug))
      .limit(1),
  ]);
  const projectRows = allProjectRows.filter((project) =>
    getIsProjectIndexed(project.ingestionStatus, project.ingestionCompletedAt)
  );
  // Failed projects are kept (never deleted) and surfaced for manual review.
  const failedProjects = allProjectRows
    .filter((project) => project.ingestionStatus === "failed")
    .map((project) => ({
      name: project.name,
      slug: project.slug,
      githubUrl: project.githubUrl,
      reason: project.ingestionError,
    }));
  const availableProjectCount = hackathonRow[0]?.availableProjectCount ?? null;

  const emptyInsights: HackathonInsights = {
    coverage: {
      availableProjectCount,
      indexedProjectCount: 0,
      githubLinkedProjects: 0,
      usableRepositoryProjects: 0,
      partialIngestionProjects: 0,
      failedIngestionProjects: failedProjects.length,
      totalSourceBytes: 0,
    },
    languages: [],
    technologies: [],
    agentSignals: [],
    codebaseSizes: [],
    medianCodebaseSizeBytes: 0,
    projectsWithoutSourceData: 0,
    failedProjects,
  };
  if (projectRows.length === 0) return emptyInsights;

  const projectIds = projectRows.map((project) => project.id);

  const [fileRows, dependencyRows, agentFileRows, agentCommitRows] = await Promise.all([
    db
      .select({
        projectId: projectRepositories.projectId,
        projectName: projects.name,
        projectSlug: projects.devpostSlug,
        language: repositoryFiles.language,
        sizeBytes: sql<number>`sum(${repositoryFiles.sizeBytes})::double precision`,
      })
      .from(repositoryFiles)
      .innerJoin(
        projectRepositories,
        eq(repositoryFiles.projectRepositoryId, projectRepositories.id),
      )
      .innerJoin(projects, eq(projectRepositories.projectId, projects.id))
      .where(and(
        inArray(projectRepositories.projectId, projectIds),
        eq(repositoryFiles.isBinary, false),
        isNotNull(repositoryFiles.language),
      ))
      .groupBy(
        projectRepositories.projectId,
        projects.name,
        projects.devpostSlug,
        repositoryFiles.language,
      ),
    db
      .selectDistinct({
        projectId: projectRepositories.projectId,
        packageName: repositoryDependencies.packageName,
      })
      .from(repositoryDependencies)
      .innerJoin(
        projectRepositories,
        eq(repositoryDependencies.projectRepositoryId, projectRepositories.id),
      )
      .where(and(
        inArray(projectRepositories.projectId, projectIds),
        inArray(
          sql<string>`lower(${repositoryDependencies.packageName})`,
          RECOGNIZED_DEPENDENCY_PACKAGES,
        ),
      )),
    db
      .selectDistinct({
        projectId: projectRepositories.projectId,
        path: repositoryFiles.path,
      })
      .from(repositoryFiles)
      .innerJoin(
        projectRepositories,
        eq(repositoryFiles.projectRepositoryId, projectRepositories.id),
      )
      .where(and(
        inArray(projectRepositories.projectId, projectIds),
        or(
          ilike(repositoryFiles.path, "%claude.md"),
          ilike(repositoryFiles.path, "%agents.md"),
          ilike(repositoryFiles.path, "%copilot-instructions.md"),
          ilike(repositoryFiles.path, "%.github/instructions/%"),
          ilike(repositoryFiles.path, "%.claude/%"),
          ilike(repositoryFiles.path, "%.codex/%"),
          ilike(repositoryFiles.path, "%.cursor/%"),
          ilike(repositoryFiles.path, "%.cursorrules"),
          ilike(repositoryFiles.path, "%.windsurf/%"),
          ilike(repositoryFiles.path, "%.windsurfrules"),
          ilike(repositoryFiles.path, "%.cline/%"),
          ilike(repositoryFiles.path, "%.clinerules"),
          ilike(repositoryFiles.path, "%.aider%"),
          ilike(repositoryFiles.path, "%.continue/%"),
        ),
      )),
    db
      .selectDistinct({
        projectId: projectRepositories.projectId,
        message: repositoryCommits.message,
        authorName: repositoryCommits.authorName,
        authorEmail: repositoryCommits.authorEmail,
      })
      .from(repositoryCommits)
      .innerJoin(
        projectRepositories,
        eq(repositoryCommits.projectRepositoryId, projectRepositories.id),
      )
      .where(and(
        inArray(projectRepositories.projectId, projectIds),
        or(
          ilike(repositoryCommits.message, "%co-authored-by:%"),
          ilike(repositoryCommits.message, "%generated with%"),
          ilike(repositoryCommits.message, "%generated by%"),
          ilike(repositoryCommits.authorName, "%claude%"),
          ilike(repositoryCommits.authorName, "%codex%"),
          ilike(repositoryCommits.authorName, "%copilot%"),
          ilike(repositoryCommits.authorEmail, "%anthropic.com%"),
          ilike(repositoryCommits.authorEmail, "%openai.com%"),
        ),
      )),
  ]);

  const projectLookup = new Map(
    projectRows.map((project) => [project.id, { name: project.name, slug: project.slug }]),
  );

  const claimedEvidence = projectRows.flatMap((project) =>
    asStringArray(project.builtWithData).flatMap((claim) => {
      const technology = normalizeClaimedTechnology(claim);
      return technology ? [{ projectId: project.id, technology }] : [];
    }));
  const detectedLanguageEvidence = fileRows.flatMap((file) => {
    const technology = file.language ? normalizeDetectedLanguage(file.language) : null;
    return technology ? [{ projectId: file.projectId, technology }] : [];
  });
  const detectedTechnologyEvidence = dependencyRows.flatMap((dependency) => {
    const technology = technologyFromDependency(dependency.packageName);
    return technology ? [{ projectId: dependency.projectId, technology }] : [];
  });

  const codebaseSizes = summarizeCodebaseSizes(fileRows.map((file) => ({
    ...file,
    sizeBytes: Number(file.sizeBytes),
  })));
  const usableProjectIds = new Set(codebaseSizes.map((project) => project.projectId));

  const agentSignals = [
    ...agentFileRows.flatMap((file) =>
      detectAgentsFromRepositoryPath(file.path).map((agent) => ({
        projectId: file.projectId,
        agent,
      }))),
    ...agentCommitRows.flatMap((commit) =>
      detectAgentsFromCommitMetadata(commit).map((agent) => ({
        projectId: commit.projectId,
        agent,
      }))),
  ].filter((signal) => usableProjectIds.has(signal.projectId));

  const partialIngestionProjects = projectRows
    .filter((project) => project.ingestionStatus === "partial").length;
  const failedIngestionProjects = failedProjects.length;
  const totalSourceBytes = codebaseSizes.reduce((total, project) => total + project.sizeBytes, 0);

  return {
    coverage: {
      availableProjectCount,
      indexedProjectCount: projectRows.length,
      githubLinkedProjects: projectRows.filter((project) => project.githubUrl?.trim()).length,
      usableRepositoryProjects: usableProjectIds.size,
      partialIngestionProjects,
      failedIngestionProjects,
      totalSourceBytes,
    },
    languages: summarizeTechnologyUsage({
      claimed: claimedEvidence,
      detected: detectedLanguageEvidence,
      category: "language",
      projectLookup,
    }),
    technologies: summarizeTechnologyUsage({
      claimed: claimedEvidence,
      detected: detectedTechnologyEvidence,
      category: "technology",
      projectLookup,
    }),
    agentSignals: summarizeAgentSignals(agentSignals, usableProjectIds.size),
    codebaseSizes,
    medianCodebaseSizeBytes: median(codebaseSizes.map((project) => project.sizeBytes)),
    projectsWithoutSourceData: Math.max(0, projectRows.length - codebaseSizes.length),
    failedProjects,
  };
}
