import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects } from "@/db/schema";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";

export type ProjectDetail = {
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
