import "server-only";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects } from "@/db/schema";

export type HackathonSearchResult = {
  kind: "hackathon";
  slug: string;
  name: string;
  organizer: string | null;
};

export type ProjectSearchResult = {
  kind: "project";
  slug: string;
  name: string;
  tagline: string | null;
  hackathonSlug: string;
  hackathonName: string;
  isWinner: boolean;
};

export type SearchResults = {
  hackathons: HackathonSearchResult[];
  projects: ProjectSearchResult[];
};

const HACKATHON_LIMIT = 5;
const PROJECT_LIMIT = 8;

const EMPTY: SearchResults = { hackathons: [], projects: [] };

/** Escapes the wildcards so a query of "100%" is not read as a pattern. */
function likePattern(query: string) {
  return `%${query.replaceAll(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export async function searchCatalog(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) return EMPTY;

  const pattern = likePattern(query);

  const [hackathonRows, projectRows] = await Promise.all([
    db
      .select({
        slug: hackathons.devpostSlug,
        name: hackathons.name,
        organizer: hackathons.organizer,
      })
      .from(hackathons)
      .where(ilike(hackathons.name, pattern))
      .orderBy(desc(hackathons.lastIndexedAt))
      .limit(HACKATHON_LIMIT),
    db
      .select({
        slug: projects.devpostSlug,
        name: projects.name,
        tagline: projects.tagline,
        hackathonSlug: hackathons.devpostSlug,
        hackathonName: hackathons.name,
        isWinner: projects.isWinner,
      })
      .from(projects)
      .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
      .where(and(
        // Same visibility rule as the project gallery: never surface a project
        // whose page would not render.
        ne(projects.ingestionStatus, "failed"),
        or(ilike(projects.name, pattern), ilike(projects.tagline, pattern)),
      ))
      // Exact prefix matches first, then winners, then alphabetical.
      .orderBy(
        sql`case when ${projects.name} ilike ${`${query}%`} then 0 else 1 end`,
        desc(projects.isWinner),
        projects.name,
      )
      .limit(PROJECT_LIMIT),
  ]);

  return {
    hackathons: hackathonRows.map((row) => ({ kind: "hackathon" as const, ...row })),
    projects: projectRows.map((row) => ({ kind: "project" as const, ...row })),
  };
}
