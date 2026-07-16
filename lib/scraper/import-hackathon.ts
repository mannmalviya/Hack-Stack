import { eq } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, projects } from "@/db/schema";

import {
  type GalleryProject,
  type ScrapedProject,
  normalizeHackathonUrl,
  parseGalleryPage,
  parseHackathonPage,
  parseProjectPage,
} from "./devpost";
import { fetchHtml, hackathonUrlGuard, projectUrlGuard } from "./fetch";
import { storeHackathonCover, storeProjectCover } from "./project-images";

export const IMPORT_LIMITS = [5, 10, 20] as const;
export type ImportLimit = (typeof IMPORT_LIMITS)[number];

export type ImportProgress =
  | { type: "gallery"; discovered: number; total: number }
  | {
      type: "project";
      completed: number;
      total: number;
      name: string;
      failed: boolean;
      detailFailed: boolean;
      imageFailed: boolean;
    };

type ImportOptions = {
  limit?: ImportLimit;
  concurrency?: number;
  onProgress?: (progress: ImportProgress) => void;
};

function fallbackProject(card: GalleryProject): ScrapedProject {
  return {
    ...card,
    description: null,
    demoUrl: null,
    videoUrl: null,
    githubUrl: null,
    isWinner: false,
    winningTrack: null,
    teamData: [],
    builtWithData: [],
  };
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

type ScrapeResult = {
  project: ScrapedProject;
  detailFetched: boolean;
  coverStored: boolean;
  coverImagePath: string | null;
  coverImageFetchedAt: string | null;
};

async function upsertProjects(hackathonId: string, scraped: ScrapeResult[]) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const result of scraped) {
      const { project } = result;
      const values = {
        hackathonId,
        devpostUrl: project.devpostUrl,
        devpostSlug: project.devpostSlug,
        name: project.name,
        tagline: project.tagline,
        coverImageSourceUrl: project.coverImageSourceUrl,
        coverImagePath: result.coverImagePath,
        coverImageFetchedAt: result.coverImageFetchedAt,
        description: project.description,
        demoUrl: project.demoUrl,
        videoUrl: project.videoUrl,
        githubUrl: project.githubUrl,
        isWinner: project.isWinner,
        winningTrack: project.winningTrack,
        teamData: project.teamData,
        builtWithData: project.builtWithData,
        updatedAt: now,
      };
      await tx
        .insert(projects)
        .values(values)
        .onConflictDoUpdate({
          target: [projects.hackathonId, projects.devpostSlug],
          // Transient detail/image failures preserve fields captured by an
          // earlier successful run while still refreshing available card data.
          set: {
            devpostUrl: project.devpostUrl,
            name: project.name,
            tagline: project.tagline,
            coverImageSourceUrl: project.coverImageSourceUrl,
            updatedAt: now,
            ...(result.detailFetched ? {
              description: project.description,
              demoUrl: project.demoUrl,
              videoUrl: project.videoUrl,
              githubUrl: project.githubUrl,
              isWinner: project.isWinner,
              winningTrack: project.winningTrack,
              teamData: project.teamData,
              builtWithData: project.builtWithData,
            } : {}),
            ...(result.coverStored ? {
              coverImagePath: result.coverImagePath,
              coverImageFetchedAt: result.coverImageFetchedAt,
            } : {}),
          },
        });
    }
  });
}

export async function importHackathon(inputUrl: string, options: ImportOptions = {}) {
  const limit = options.limit ?? 20;
  const concurrency = options.concurrency ?? 4;
  if (!IMPORT_LIMITS.includes(limit)) throw new Error("Import limit must be 5, 10, or 20");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("Concurrency must be an integer between 1 and 8");
  }

  const source = normalizeHackathonUrl(inputUrl);
  const galleryGuard = hackathonUrlGuard(new URL(source.galleryUrl).hostname);
  const firstGalleryHtml = await fetchHtml(source.galleryUrl, galleryGuard);
  const metadata = parseHackathonPage(firstGalleryHtml);
  const now = new Date().toISOString();
  const [hackathon] = await db
    .insert(hackathons)
    .values({
      devpostUrl: source.devpostUrl,
      devpostSlug: source.devpostSlug,
      ...metadata,
      indexingStatus: "running",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: hackathons.devpostSlug,
      set: {
        devpostUrl: source.devpostUrl,
        ...metadata,
        indexingStatus: "running",
        updatedAt: now,
      },
    })
    .returning({ id: hackathons.id });

  let imageFailures = 0;
  try {
    if (metadata.coverImageSourceUrl) {
      try {
        const storedCover = await storeHackathonCover({
          sourceUrl: metadata.coverImageSourceUrl,
          hackathonSlug: source.devpostSlug,
        });
        await db
          .update(hackathons)
          .set({
            coverImagePath: storedCover.path,
            coverImageFetchedAt: storedCover.fetchedAt,
            updatedAt: storedCover.fetchedAt,
          })
          .where(eq(hackathons.id, hackathon.id));
      } catch {
        // Keep a previously stored cover when a transient image fetch fails.
        imageFailures += 1;
      }
    }

    const cards: GalleryProject[] = [];
    const seen = new Set<string>();
    let html = firstGalleryHtml;
    let page = 1;

    while (cards.length < limit) {
      const parsed = parseGalleryPage(html);
      for (const card of parsed.projects) {
        if (!seen.has(card.devpostUrl)) {
          seen.add(card.devpostUrl);
          cards.push(card);
        }
        if (cards.length === limit) break;
      }
      options.onProgress?.({
        type: "gallery",
        discovered: cards.length,
        total: Math.min(limit, metadata.projectCount),
      });

      if (!parsed.nextHref || cards.length >= limit) break;
      page += 1;
      if (page > 10) throw new Error("Gallery pagination exceeded the safety limit");
      const nextUrl = new URL(parsed.nextHref, source.galleryUrl);
      html = await fetchHtml(nextUrl.toString(), galleryGuard);
    }

    if (cards.length === 0) throw new Error("No public projects were found in this gallery");
    const selectedCards = cards.slice(0, limit);
    let detailFailures = 0;
    let completed = 0;
    const scraped = await mapConcurrent(selectedCards, concurrency, async (card) => {
      let detailFailed = false;
      let imageFailed = false;
      let project: ScrapedProject;
      try {
        const projectHtml = await fetchHtml(card.devpostUrl, projectUrlGuard);
        project = parseProjectPage(projectHtml, card, source.devpostUrl);
      } catch {
        detailFailures += 1;
        detailFailed = true;
        project = fallbackProject(card);
      }

      let storedCover: { path: string; fetchedAt: string } | null = null;
      if (project.coverImageSourceUrl) {
        try {
          storedCover = await storeProjectCover({
            sourceUrl: project.coverImageSourceUrl,
            hackathonSlug: source.devpostSlug,
            projectSlug: project.devpostSlug,
          });
        } catch {
          imageFailures += 1;
          imageFailed = true;
        }
      }
      completed += 1;
      options.onProgress?.({
        type: "project",
        completed,
        total: selectedCards.length,
        name: card.name,
        failed: detailFailed || imageFailed,
        detailFailed,
        imageFailed,
      });
      return {
        project,
        detailFetched: !detailFailed,
        coverStored: Boolean(storedCover),
        coverImagePath: storedCover?.path ?? null,
        coverImageFetchedAt: storedCover?.fetchedAt ?? null,
      };
    });

    await upsertProjects(hackathon.id, scraped);
    const status = detailFailures > 0 || imageFailures > 0 ? "partial" : "succeeded";
    const completedAt = new Date().toISOString();
    await db
      .update(hackathons)
      .set({
        indexingStatus: status,
        lastIndexedAt: completedAt,
        updatedAt: completedAt,
      })
      .where(eq(hackathons.id, hackathon.id));

    return {
      hackathonId: hackathon.id,
      hackathon: metadata.name,
      status,
      imported: scraped.length,
      failedDetails: detailFailures,
      failedImages: imageFailures,
      availableProjects: metadata.projectCount,
    };
  } catch (error) {
    await db
      .update(hackathons)
      .set({ indexingStatus: "failed", updatedAt: new Date().toISOString() })
      .where(eq(hackathons.id, hackathon.id));
    throw error;
  }
}
