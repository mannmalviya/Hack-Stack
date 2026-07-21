import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  ne,
  or,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { HACKATHON_CACHE_SECONDS, HACKATHON_CACHE_TAG } from "@/lib/data/cache";
import {
  hackathons,
  hackerContributorMetrics,
  hackerInsightRuns,
  projectRepositories,
  projects,
  repositoryCommits,
  repositoryFiles,
} from "@/db/schema";
import {
  getIndexCoverage,
  getIsFullyIndexed,
  getIsProcessingComplete,
  type IndexCoverage,
} from "@/lib/index-coverage";
import { getHackathonCoverPublicUrl } from "@/lib/supabase/hackathon-covers";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";
import {
  AI_CODE_AGENTS,
  detectAgentsFromCommitMetadata,
  detectAgentsFromRepositoryPath,
  type AiCodeAgent,
} from "@/lib/insights/hackathon-analytics";

export type EventStatus = "upcoming" | "active" | "completed";
export type IndexingStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
export type IndexingStage =
  | "discovering_projects"
  | "scraping_projects"
  | "ingesting_repositories"
  | "calculating_hacker_insights";

export type HackathonListItem = {
  slug: string;
  devpostUrl: string;
  name: string;
  organizer: string | null;
  description: string | null;
  coverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  availableProjectCount: number | null;
  processedProjectCount: number;
  indexedProjectCount: number;
  indexCoverage: IndexCoverage;
  eventStatus: EventStatus;
  indexingStatus: IndexingStatus;
  indexingStage: IndexingStage | null;
  indexingProgressCompleted: number;
  indexingProgressTotal: number | null;
  isFullyIndexed: boolean;
  isProcessingComplete: boolean;
  lastIndexedAt: string | null;
};

export type ProjectListItem = {
  slug: string;
  devpostUrl: string;
  name: string;
  tagline: string | null;
  coverImageUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  isWinner: boolean;
  winningTrack: string | null;
  teamSize: number;
  builtWith: string[];
};

export type ProjectCardContributor = {
  githubUserId: number;
  githubLogin: string;
  displayName: string;
  creditedCommitCount: number;
};

export type HackathonProjectListItem = ProjectListItem & {
  contributors: ProjectCardContributor[];
  agentSignals: AiCodeAgent[];
};

export type FeaturedProject = ProjectListItem & {
  hackathonName: string;
  hackathonSlug: string;
};

function getEventStatus(startsAt: string | null, endsAt: string | null): EventStatus {
  const now = Date.now();
  if (startsAt && Date.parse(startsAt) > now) return "upcoming";
  if (endsAt && Date.parse(endsAt) < now) return "completed";
  return "active";
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

const hackathonSelection = {
  slug: hackathons.devpostSlug,
  devpostUrl: hackathons.devpostUrl,
  name: hackathons.name,
  organizer: hackathons.organizer,
  description: hackathons.description,
  coverImagePath: hackathons.coverImagePath,
  startsAt: hackathons.startsAt,
  endsAt: hackathons.endsAt,
  availableProjectCount: hackathons.projectCount,
  processedProjectCount: count(projects.id),
  indexedProjectCount: count(projects.ingestionCompletedAt),
  indexingStatus: hackathons.indexingStatus,
  indexingStage: hackathons.indexingStage,
  indexingProgressCompleted: hackathons.indexingProgressCompleted,
  indexingProgressTotal: hackathons.indexingProgressTotal,
  lastIndexedAt: hackathons.lastIndexedAt,
};

type HackathonRow = {
  slug: string;
  devpostUrl: string;
  name: string;
  organizer: string | null;
  description: string | null;
  coverImagePath: string | null;
  startsAt: string | null;
  endsAt: string | null;
  availableProjectCount: number | null;
  processedProjectCount: number;
  indexedProjectCount: number;
  indexingStatus: string;
  indexingStage: string | null;
  indexingProgressCompleted: number;
  indexingProgressTotal: number | null;
  lastIndexedAt: string | null;
};

function mapHackathon(row: HackathonRow): HackathonListItem {
  const { coverImagePath, ...hackathon } = row;
  const indexCoverage = getIndexCoverage(row.indexedProjectCount, row.availableProjectCount);
  return {
    ...hackathon,
    coverImageUrl: getHackathonCoverPublicUrl(coverImagePath),
    indexCoverage,
    indexingStatus: row.indexingStatus as IndexingStatus,
    indexingStage: row.indexingStage as IndexingStage | null,
    isFullyIndexed: getIsFullyIndexed(
      row.indexingStatus,
      row.indexedProjectCount,
      row.availableProjectCount,
    ),
    isProcessingComplete: getIsProcessingComplete(row.indexingStatus),
    eventStatus: getEventStatus(row.startsAt, row.endsAt),
  };
}

export async function getHackathons(): Promise<HackathonListItem[]> {
  const rows = await db
    .select(hackathonSelection)
    .from(hackathons)
    .leftJoin(projects, eq(projects.hackathonId, hackathons.id))
    .groupBy(hackathons.id)
    .orderBy(desc(hackathons.lastIndexedAt), desc(hackathons.createdAt));

  return rows.map(mapHackathon);
}

export async function getHackathonBySlug(slug: string): Promise<HackathonListItem | null> {
  const [row] = await db
    .select(hackathonSelection)
    .from(hackathons)
    .leftJoin(projects, eq(projects.hackathonId, hackathons.id))
    .where(eq(hackathons.devpostSlug, slug))
    .groupBy(hackathons.id)
    .limit(1);

  return row ? mapHackathon(row) : null;
}

async function loadProjectsByHackathon(
  slug: string,
): Promise<HackathonProjectListItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.devpostSlug,
      devpostUrl: projects.devpostUrl,
      name: projects.name,
      tagline: projects.tagline,
      coverImagePath: projects.coverImagePath,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      videoUrl: projects.videoUrl,
      isWinner: projects.isWinner,
      winningTrack: projects.winningTrack,
      teamData: projects.teamData,
      builtWithData: projects.builtWithData,
    })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(
      eq(hackathons.devpostSlug, slug),
      ne(projects.ingestionStatus, "failed"),
    ))
    .orderBy(desc(projects.isWinner), asc(projects.name));

  if (rows.length === 0) return [];

  const projectIds = rows.map((row) => row.id);
  const [latestSucceededRun, agentFileRows, agentCommitRows] = await Promise.all([
    db
      .select({ id: hackerInsightRuns.id })
      .from(hackerInsightRuns)
      .innerJoin(hackathons, eq(hackerInsightRuns.hackathonId, hackathons.id))
      .where(and(
        eq(hackathons.devpostSlug, slug),
        eq(hackerInsightRuns.status, "succeeded"),
      ))
      .orderBy(desc(hackerInsightRuns.sourceLastIndexedAt), desc(hackerInsightRuns.id))
      .limit(1),
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

  const contributorRows = latestSucceededRun[0]
    ? await db
      .select({
        projectId: hackerContributorMetrics.projectId,
        githubUserId: hackerContributorMetrics.githubUserId,
        githubLogin: hackerContributorMetrics.githubLogin,
        displayName: hackerContributorMetrics.displayName,
        creditedCommitCount: hackerContributorMetrics.creditedCommitCount,
      })
      .from(hackerContributorMetrics)
      .where(and(
        eq(hackerContributorMetrics.runId, latestSucceededRun[0].id),
        inArray(hackerContributorMetrics.projectId, projectIds),
      ))
    : [];

  const contributorsByProject = new Map<string, ProjectCardContributor[]>();
  for (const { projectId, ...contributor } of contributorRows) {
    const contributors = contributorsByProject.get(projectId) ?? [];
    contributors.push(contributor);
    contributorsByProject.set(projectId, contributors);
  }
  for (const contributors of contributorsByProject.values()) {
    contributors.sort((left, right) =>
      right.creditedCommitCount - left.creditedCommitCount
      || left.githubLogin.localeCompare(right.githubLogin)
    );
  }

  const agentSignalsByProject = new Map<string, Set<AiCodeAgent>>();
  const addAgentSignal = (projectId: string, agent: AiCodeAgent) => {
    const signals = agentSignalsByProject.get(projectId) ?? new Set<AiCodeAgent>();
    signals.add(agent);
    agentSignalsByProject.set(projectId, signals);
  };
  for (const file of agentFileRows) {
    for (const agent of detectAgentsFromRepositoryPath(file.path)) {
      addAgentSignal(file.projectId, agent);
    }
  }
  for (const commit of agentCommitRows) {
    for (const agent of detectAgentsFromCommitMetadata(commit)) {
      addAgentSignal(commit.projectId, agent);
    }
  }

  return rows.map(({ id, ...row }) => ({
    slug: row.slug,
    devpostUrl: row.devpostUrl,
    name: row.name,
    tagline: row.tagline,
    coverImageUrl: getProjectCoverPublicUrl(row.coverImagePath),
    githubUrl: row.githubUrl,
    demoUrl: row.demoUrl,
    videoUrl: row.videoUrl,
    isWinner: row.isWinner,
    winningTrack: row.winningTrack,
    teamSize: asArrayLength(row.teamData),
    builtWith: asStringArray(row.builtWithData),
    contributors: contributorsByProject.get(id) ?? [],
    agentSignals: AI_CODE_AGENTS.filter((agent) =>
      agentSignalsByProject.get(id)?.has(agent)
    ),
  }));
}

/**
 * Agent-signal detection matches repository paths and commit metadata with
 * leading-wildcard ILIKEs, which no index can serve, so the cost scales with
 * every file and commit indexed for the hackathon. The inputs only change when
 * a repository is re-ingested, so the result is cached instead of rescanned on
 * every request. Revalidation is deliberately long; a newly indexed project
 * appears here once the entry expires.
 */
export const getProjectsByHackathon = unstable_cache(
  loadProjectsByHackathon,
  ["hackathon-projects"],
  { revalidate: HACKATHON_CACHE_SECONDS, tags: [HACKATHON_CACHE_TAG] },
);

export async function getFeaturedProjects(limit = 6): Promise<FeaturedProject[]> {
  const rows = await db
    .select({
      slug: projects.devpostSlug,
      devpostUrl: projects.devpostUrl,
      name: projects.name,
      tagline: projects.tagline,
      coverImagePath: projects.coverImagePath,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      videoUrl: projects.videoUrl,
      isWinner: projects.isWinner,
      winningTrack: projects.winningTrack,
      teamData: projects.teamData,
      builtWithData: projects.builtWithData,
      hackathonName: hackathons.name,
      hackathonSlug: hackathons.devpostSlug,
    })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(isNotNull(projects.ingestionCompletedAt))
    .orderBy(desc(projects.isWinner), desc(projects.updatedAt))
    .limit(Math.max(1, Math.min(limit, 12)));

  return rows.map((row) => ({
    slug: row.slug,
    devpostUrl: row.devpostUrl,
    name: row.name,
    tagline: row.tagline,
    coverImageUrl: getProjectCoverPublicUrl(row.coverImagePath),
    githubUrl: row.githubUrl,
    demoUrl: row.demoUrl,
    videoUrl: row.videoUrl,
    isWinner: row.isWinner,
    winningTrack: row.winningTrack,
    teamSize: asArrayLength(row.teamData),
    builtWith: asStringArray(row.builtWithData),
    hackathonName: row.hackathonName,
    hackathonSlug: row.hackathonSlug,
  }));
}
