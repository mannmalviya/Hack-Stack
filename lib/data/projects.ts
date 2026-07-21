import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects } from "@/db/schema";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";

export type ProjectDetail = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  devpostUrl: string;
  coverImageUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  isWinner: boolean;
  winningTrack: string | null;
  hackathonName: string;
  hackathonSlug: string;
};

/**
 * `devpost_slug` is only unique within a hackathon, so a project lookup always
 * needs both slugs.
 */
export async function getProjectBySlug(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ProjectDetail | null> {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.devpostSlug,
      name: projects.name,
      tagline: projects.tagline,
      description: projects.description,
      devpostUrl: projects.devpostUrl,
      coverImagePath: projects.coverImagePath,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      videoUrl: projects.videoUrl,
      isWinner: projects.isWinner,
      winningTrack: projects.winningTrack,
      hackathonName: hackathons.name,
      hackathonSlug: hackathons.devpostSlug,
    })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(
      and(
        eq(hackathons.devpostSlug, hackathonSlug),
        eq(projects.devpostSlug, projectSlug),
      ),
    )
    .limit(1);

  if (!row) return null;

  const { coverImagePath, ...project } = row;
  return { ...project, coverImageUrl: getProjectCoverPublicUrl(coverImagePath) };
}

export type ProjectNeighbour = { slug: string; name: string };

export type ProjectNeighbours = {
  previous: ProjectNeighbour | null;
  next: ProjectNeighbour | null;
};

/**
 * Adjacent projects for in-page navigation.
 *
 * The filter and ordering deliberately mirror `getProjectsByHackathon`, so
 * stepping through projects here walks the gallery in the order a judge sees
 * it, and never lands on a project the gallery hides.
 */
export async function getProjectNeighbours(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ProjectNeighbours> {
  const rows = await db
    .select({ slug: projects.devpostSlug, name: projects.name })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(
      and(
        eq(hackathons.devpostSlug, hackathonSlug),
        ne(projects.ingestionStatus, "failed"),
      ),
    )
    .orderBy(desc(projects.isWinner), asc(projects.name));

  const index = rows.findIndex((row) => row.slug === projectSlug);
  if (index === -1) return { previous: null, next: null };

  // Ends stay null rather than wrapping, so the arrows can show where the list
  // stops instead of silently looping.
  return {
    previous: rows[index - 1] ?? null,
    next: rows[index + 1] ?? null,
  };
}
