import "server-only";

import { and, asc, count, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects, projectStars } from "@/db/schema";
import { parseGithubRepositoryUrl } from "@/lib/github/urls";

export type ProjectReelItem = {
  id: string;
  slug: string;
  name: string;
  devpostUrl: string;
  githubUrl: string | null;
  videoUrl: string;
  isWinner: boolean;
  starCount: number;
  starred: boolean;
  /** Carried per item so a feed can mix projects from several hackathons. */
  hackathonSlug: string;
  hackathonName: string;
};

/** Reel cards link straight out, so drop urls the parser can't canonicalise. */
function canonicalGithubUrl(githubUrl: string | null) {
  if (!githubUrl) return null;
  try {
    return parseGithubRepositoryUrl(githubUrl).canonicalUrl;
  } catch {
    return null;
  }
}

const reelSelection = {
  id: projects.id,
  slug: projects.devpostSlug,
  name: projects.name,
  devpostUrl: projects.devpostUrl,
  githubUrl: projects.githubUrl,
  videoUrl: projects.videoUrl,
  isWinner: projects.isWinner,
  starCount: count(projectStars.userId),
  hackathonSlug: hackathons.devpostSlug,
  hackathonName: hackathons.name,
};

type ReelRow = {
  id: string;
  slug: string;
  name: string;
  devpostUrl: string;
  githubUrl: string | null;
  videoUrl: string | null;
  isWinner: boolean;
  starCount: number;
  hackathonSlug: string;
  hackathonName: string;
};

/**
 * A user's stars are bounded by their own clicks, so fetching them all at once
 * is cheaper than a filtered join per feed.
 */
async function getStarredProjectIds(userId: string | null) {
  if (!userId) return new Set<string>();
  const rows = await db
    .select({ projectId: projectStars.projectId })
    .from(projectStars)
    .where(eq(projectStars.userId, userId));
  return new Set(rows.map((row) => row.projectId));
}

function toReelItems(rows: ReelRow[], starredIds: Set<string>): ProjectReelItem[] {
  return rows.flatMap((row) =>
    row.videoUrl
      ? [{
          id: row.id,
          slug: row.slug,
          name: row.name,
          devpostUrl: row.devpostUrl,
          githubUrl: canonicalGithubUrl(row.githubUrl),
          videoUrl: row.videoUrl,
          isWinner: row.isWinner,
          starCount: row.starCount,
          starred: starredIds.has(row.id),
          hackathonSlug: row.hackathonSlug,
          hackathonName: row.hackathonName,
        }]
      : [],
  );
}

/**
 * One hackathon's projects that submitted a demo video, in the same order as
 * the gallery, with star counts and whether the viewer has starred each one.
 */
export async function getProjectReels(
  slug: string,
  userId: string | null,
): Promise<ProjectReelItem[]> {
  const [rows, starredIds] = await Promise.all([
    db
      .select(reelSelection)
      .from(projects)
      .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
      .leftJoin(projectStars, eq(projectStars.projectId, projects.id))
      .where(and(
        eq(hackathons.devpostSlug, slug),
        ne(projects.ingestionStatus, "failed"),
        isNotNull(projects.videoUrl),
      ))
      // Grouping by both primary keys keeps the hackathon columns functionally
      // dependent, so Postgres accepts them without aggregating.
      .groupBy(projects.id, hackathons.id)
      .orderBy(desc(projects.isWinner), asc(projects.name)),
    getStarredProjectIds(userId),
  ]);

  return toReelItems(rows, starredIds);
}

/**
 * A random slice of demo videos drawn from every hackathon.
 *
 * Shuffling happens in Postgres so the pick is uniform across the whole table
 * rather than a reshuffle of some arbitrary first page.
 */
export async function getDiscoverReels(
  userId: string | null,
  limit = 40,
): Promise<ProjectReelItem[]> {
  const [rows, starredIds] = await Promise.all([
    db
      .select(reelSelection)
      .from(projects)
      .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
      .leftJoin(projectStars, eq(projectStars.projectId, projects.id))
      .where(and(
        ne(projects.ingestionStatus, "failed"),
        isNotNull(projects.videoUrl),
      ))
      .groupBy(projects.id, hackathons.id)
      .orderBy(sql`random()`)
      .limit(Math.max(1, Math.min(limit, 100))),
    getStarredProjectIds(userId),
  ]);

  return toReelItems(rows, starredIds);
}
