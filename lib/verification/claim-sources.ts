import { eq } from "drizzle-orm";

import { db } from "../../db";
import { projectEmbeddingSources, projects } from "../../db/schema";

// The Devpost-derived claim text for one project. The README is added later from
// the clone itself, so it is not gathered here.
export type ProjectClaims = {
  name: string;
  tagline: string | null;
  description: string | null;
  builtWith: string[];
  inspiration: string | null;
  whatItDoes: string | null;
};

// builtWithData is JSONB of loosely-typed scraped data; keep only the strings.
function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Gathers the claim text a project makes about itself on Devpost. Returns null
 * when the project row is missing. The embedding source (inspiration / what it
 * does) is optional — not every imported project has one.
 */
export async function getProjectClaims(
  projectId: string,
): Promise<ProjectClaims | null> {
  const [project] = await db
    .select({
      name: projects.name,
      tagline: projects.tagline,
      description: projects.description,
      builtWithData: projects.builtWithData,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return null;

  const [story] = await db
    .select({
      inspiration: projectEmbeddingSources.inspiration,
      whatItDoes: projectEmbeddingSources.whatItDoes,
    })
    .from(projectEmbeddingSources)
    .where(eq(projectEmbeddingSources.projectId, projectId))
    .limit(1);

  return {
    name: project.name,
    tagline: project.tagline,
    description: project.description,
    builtWith: asStringArray(project.builtWithData),
    inspiration: story?.inspiration ?? null,
    whatItDoes: story?.whatItDoes ?? null,
  };
}
