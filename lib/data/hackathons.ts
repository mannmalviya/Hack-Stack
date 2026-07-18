import "server-only";

import { and, asc, count, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects } from "@/db/schema";
import {
  getIndexCoverage,
  getIsFullyIndexed,
  getIsProcessingComplete,
  type IndexCoverage,
} from "@/lib/index-coverage";
import { getHackathonCoverPublicUrl } from "@/lib/supabase/hackathon-covers";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";

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
    isProcessingComplete: getIsProcessingComplete(
      row.indexingStatus,
      row.processedProjectCount,
      row.availableProjectCount,
    ),
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

export async function getProjectsByHackathon(slug: string): Promise<ProjectListItem[]> {
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
    })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(
      eq(hackathons.devpostSlug, slug),
      isNotNull(projects.ingestionCompletedAt),
    ))
    .orderBy(desc(projects.isWinner), asc(projects.name));

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
  }));
}

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
