import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects, projectStars } from "@/db/schema";
import type { FeaturedProject } from "@/lib/data/hackathons";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * A user's starred projects, newest star first.
 *
 * Stars span hackathons, so this returns the same shape as the landing page's
 * featured projects — the card needs the hackathon to build its link.
 */
export async function getStarredProjects(userId: string): Promise<FeaturedProject[]> {
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
    .from(projectStars)
    .innerJoin(projects, eq(projectStars.projectId, projects.id))
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(eq(projectStars.userId, userId))
    .orderBy(desc(projectStars.createdAt));

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

/** Whether this user has starred this project. False for guests. */
export async function isProjectStarred(userId: string | null, projectId: string) {
  if (!userId) return false;
  const [star] = await db
    .select({ projectId: projectStars.projectId })
    .from(projectStars)
    .where(and(
      eq(projectStars.userId, userId),
      eq(projectStars.projectId, projectId),
    ))
    .limit(1);
  return Boolean(star);
}
