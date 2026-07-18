import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { hackathons, projectEmbeddingSources, projects } from "@/db/schema";

import {
  type GalleryProject,
  type ScrapedProject,
  normalizeHackathonUrl,
  normalizeProjectUrl,
  parseGalleryPage,
  parseHackathonPage,
  parseProjectPage,
} from "./devpost";
import { fetchHtml, hackathonUrlGuard, projectUrlGuard } from "./fetch";
import { IMPORT_LIMITS, type ImportLimit } from "./import-limits";
import { shouldProcessProject } from "./incremental-import";
import {
  storeHackathonCover,
  storeProjectCover,
} from "./project-images";
import {
  ingestProjectGithubRepositories,
  type GithubIngestionResult,
} from "@/lib/github/ingest";
import { calculateHackerInsights } from "@/lib/insights/calculate-hacker-insights";

export { IMPORT_LIMITS, type ImportLimit } from "./import-limits";

const MAX_GALLERY_PAGES = 1000;

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
    }
  | {
      type: "github";
      completed: number;
      total: number;
      name: string;
      status: GithubIngestionResult["status"];
      repository: string | null;
      error: string | null;
    }
  | {
      type: "insights";
      status: "running" | "succeeded" | "failed";
      error: string | null;
    };

type ImportOptions = {
  limit?: ImportLimit;
  concurrency?: number;
  projectUrl?: string;
  onProgress?: (progress: ImportProgress) => void | Promise<void>;
};

function fallbackProject(card: GalleryProject): ScrapedProject {
  return {
    ...card,
    description: null,
    inspiration: null,
    whatItDoes: null,
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

const DETAIL_FAILURE_MESSAGE = "Devpost project page could not be fetched";
const ERROR_DETAIL_LIMIT = 2000;

type ScrapeResult = {
  project: ScrapedProject;
  detailFailed: boolean;
  imageFailed: boolean;
  coverImagePath: string | null;
  coverImageFetchedAt: string | null;
};

type StoredProject = {
  id: string;
  name: string;
  githubUrl: string | null;
};

async function upsertProjects(hackathonId: string, scraped: ScrapeResult[]) {
  const now = new Date().toISOString();
  const persisted: StoredProject[] = [];
  await db.transaction(async (tx) => {
    for (const result of scraped) {
      const { project } = result;
      // A failed detail fetch leaves only gallery-card data. Keep the row so it
      // can be reviewed and retried on the next import; GitHub-linked projects
      // stay `pending` until repository ingestion finalizes their status.
      const ingestion = result.detailFailed
        ? {
            status: "failed",
            completedAt: null as string | null,
            error: DETAIL_FAILURE_MESSAGE as string | null,
          }
        : project.githubUrl
          ? { status: "pending", completedAt: null as string | null, error: null as string | null }
          : { status: "succeeded", completedAt: now as string | null, error: null as string | null };
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
        ingestionCompletedAt: ingestion.completedAt,
        ingestionStatus: ingestion.status,
        ingestionError: ingestion.error,
        builtWithData: project.builtWithData,
        updatedAt: now,
      };
      const [stored] = await tx
        .insert(projects)
        .values(values)
        .onConflictDoUpdate({
          target: [projects.hackathonId, projects.devpostSlug],
          set: values,
        })
        .returning({
          id: projects.id,
          name: projects.name,
          githubUrl: projects.githubUrl,
        });

      if (!result.detailFailed) {
        if (project.inspiration && project.whatItDoes) {
          await tx
            .insert(projectEmbeddingSources)
            .values({
              projectId: stored.id,
              inspiration: project.inspiration,
              whatItDoes: project.whatItDoes,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: projectEmbeddingSources.projectId,
              set: {
                inspiration: project.inspiration,
                whatItDoes: project.whatItDoes,
                updatedAt: now,
              },
            });
        } else {
          await tx
            .delete(projectEmbeddingSources)
            .where(eq(projectEmbeddingSources.projectId, stored.id));
        }
      }
      persisted.push(stored);
    }
  });
  return persisted;
}

export async function importHackathon(inputUrl: string, options: ImportOptions = {}) {
  const limit = options.limit ?? "all";
  const requestedProjectUrl = options.projectUrl
    ? normalizeProjectUrl(options.projectUrl)
    : null;
  if (options.projectUrl && !requestedProjectUrl) {
    throw new Error("Project URL must use https://devpost.com/software/<project>");
  }
  const concurrency = options.concurrency ?? 4;
  if (!IMPORT_LIMITS.some((candidate) => candidate === limit)) {
    throw new Error("Import limit must be 5, 10, 20, or all");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("Concurrency must be an integer between 1 and 8");
  }

  const source = normalizeHackathonUrl(inputUrl);
  const galleryGuard = hackathonUrlGuard(new URL(source.galleryUrl).hostname);
  const firstGalleryHtml = await fetchHtml(source.galleryUrl, galleryGuard);
  const metadata = parseHackathonPage(firstGalleryHtml);
  const now = new Date().toISOString();
  // A project-scoped import adds one submission to a gallery it does not own,
  // and can run while a full import of the same hackathon is in flight. Only a
  // full import may publish hackathon-wide indexing status and progress; a
  // targeted run leaves those columns (and a new row's "queued" default) alone.
  const ownsHackathonProgress = requestedProjectUrl === null;
  const galleryIndexingState = ownsHackathonProgress
    ? {
      indexingStatus: "running",
      indexingStage: "discovering_projects",
      indexingProgressCompleted: 0,
      indexingProgressTotal: metadata.projectCount,
    }
    : {};
  const [hackathon] = await db
    .insert(hackathons)
    .values({
      devpostUrl: source.devpostUrl,
      devpostSlug: source.devpostSlug,
      ...metadata,
      ...galleryIndexingState,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: hackathons.devpostSlug,
      set: {
        devpostUrl: source.devpostUrl,
        ...metadata,
        ...galleryIndexingState,
        updatedAt: now,
      },
    })
    .returning({
      id: hackathons.id,
      coverImagePath: hackathons.coverImagePath,
    });

  // Single place where hackathon-wide indexing status/progress is published, so
  // a targeted import stays a no-op instead of stomping a concurrent full run.
  async function publishHackathonProgress(
    values: PgUpdateSetSource<typeof hackathons>,
  ) {
    if (!ownsHackathonProgress) return;
    await db.update(hackathons).set(values).where(eq(hackathons.id, hackathon.id));
  }

  let imageFailures = 0;
  try {
    if (metadata.coverImageSourceUrl && !hackathon.coverImagePath) {
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
    const visitedGalleryUrls = new Set([source.galleryUrl]);
    let html = firstGalleryHtml;
    let page = 1;

    while (
      requestedProjectUrl
        ? !seen.has(requestedProjectUrl)
        : limit === "all" || cards.length < limit
    ) {
      const parsed = parseGalleryPage(html);
      for (const card of parsed.projects) {
        if (!seen.has(card.devpostUrl)) {
          seen.add(card.devpostUrl);
          cards.push(card);
        }
        if (!requestedProjectUrl && limit !== "all" && cards.length === limit) break;
      }
      const galleryProgressTotal = limit === "all"
        ? Math.max(cards.length, metadata.projectCount)
        : Math.max(cards.length, Math.min(limit, metadata.projectCount));
      await publishHackathonProgress({
        indexingStage: "discovering_projects",
        indexingProgressCompleted: cards.length,
        indexingProgressTotal: galleryProgressTotal,
        updatedAt: new Date().toISOString(),
      });
      await options.onProgress?.({
        type: "gallery",
        discovered: cards.length,
        total: galleryProgressTotal,
      });

      if (
        !parsed.nextHref
        || (requestedProjectUrl && seen.has(requestedProjectUrl))
        || (!requestedProjectUrl && limit !== "all" && cards.length >= limit)
      ) break;
      page += 1;
      if (page > MAX_GALLERY_PAGES) {
        throw new Error(`Gallery pagination exceeded ${MAX_GALLERY_PAGES} pages`);
      }
      const nextUrl = new URL(parsed.nextHref, source.galleryUrl);
      nextUrl.hash = "";
      const nextUrlString = nextUrl.toString();
      if (visitedGalleryUrls.has(nextUrlString)) {
        throw new Error(`Gallery pagination repeated ${nextUrlString}`);
      }
      visitedGalleryUrls.add(nextUrlString);
      html = await fetchHtml(nextUrlString, galleryGuard);
    }

    if (cards.length === 0) throw new Error("No public projects were found in this gallery");
    const selectedCards = requestedProjectUrl
      ? cards.filter((card) => card.devpostUrl === requestedProjectUrl)
      : limit === "all" ? cards : cards.slice(0, limit);
    if (requestedProjectUrl && selectedCards.length === 0) {
      throw new Error("The requested project was not found in its hackathon gallery");
    }
    const existingProjects = await db
      .select({
        devpostSlug: projects.devpostSlug,
        ingestionCompletedAt: projects.ingestionCompletedAt,
      })
      .from(projects)
      .where(and(
        eq(projects.hackathonId, hackathon.id),
        inArray(projects.devpostSlug, selectedCards.map((card) => card.devpostSlug)),
      ));
    const existingBySlug = new Map(
      existingProjects.map((project) => [project.devpostSlug, project]),
    );
    // Only reprocess projects that are missing or did not complete (failed rows
    // are kept in place and updated by the upsert below, preserving their id).
    const projectsToProcess = selectedCards.filter((card) =>
      shouldProcessProject(existingBySlug.get(card.devpostSlug))
    );
    await publishHackathonProgress({
      indexingStage: "scraping_projects",
      indexingProgressCompleted: 0,
      indexingProgressTotal: projectsToProcess.length,
      updatedAt: new Date().toISOString(),
    });
    let detailFailures = 0;
    let completed = 0;
    const scraped = await mapConcurrent(projectsToProcess, concurrency, async (card) => {
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
      if (!detailFailed && project.coverImageSourceUrl) {
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
      const progressUpdatedAt = new Date().toISOString();
      await publishHackathonProgress({
        indexingProgressCompleted: sql`greatest(${hackathons.indexingProgressCompleted}, ${completed})`,
        updatedAt: progressUpdatedAt,
      });
      await options.onProgress?.({
        type: "project",
        completed,
        total: projectsToProcess.length,
        name: card.name,
        failed: detailFailed || imageFailed,
        detailFailed,
        imageFailed,
      });
      return {
        project,
        detailFailed,
        imageFailed,
        coverImagePath: storedCover?.path ?? null,
        coverImageFetchedAt: storedCover?.fetchedAt ?? null,
      };
    });

    // Persist every scraped project — including detail failures — so nothing is
    // dropped. A transient cover-image failure keeps the project with a null
    // cover rather than discarding it.
    const persistedProjects = await upsertProjects(hackathon.id, scraped);
    const githubProjects = persistedProjects.filter(
      (project): project is typeof project & { githubUrl: string } => Boolean(project.githubUrl),
    );
    await publishHackathonProgress({
      indexingStage: "ingesting_repositories",
      indexingProgressCompleted: 0,
      indexingProgressTotal: githubProjects.length,
      updatedAt: new Date().toISOString(),
    });
    let completedGithubProjects = 0;
    const githubResults = await ingestProjectGithubRepositories(githubProjects, {
      async onProjectComplete(result) {
        completedGithubProjects += 1;
        const progressUpdatedAt = new Date().toISOString();
        await publishHackathonProgress({
          indexingProgressCompleted: sql`greatest(${hackathons.indexingProgressCompleted}, ${completedGithubProjects})`,
          updatedAt: progressUpdatedAt,
        });
        await options.onProgress?.({
          type: "github",
          completed: completedGithubProjects,
          total: githubProjects.length,
          name: result.projectName,
          status: result.status,
          repository: result.repository,
          error: result.error,
        });
      },
    });
    // Finalize each GitHub-linked project in place. Failures keep the row with a
    // null completion timestamp (so the next import retries it) and record the
    // reason for manual review; partial/succeeded runs mark the row complete.
    for (const result of githubResults) {
      const finalizedAt = new Date().toISOString();
      if (result.status === "failed") {
        await db
          .update(projects)
          .set({
            ingestionStatus: "failed",
            ingestionError: (result.error ?? "GitHub ingestion failed").slice(0, ERROR_DETAIL_LIMIT),
            updatedAt: finalizedAt,
          })
          .where(eq(projects.id, result.projectId));
      } else {
        await db
          .update(projects)
          .set({
            ingestionStatus: result.status,
            ingestionError: result.status === "partial"
              ? result.warnings.join("\n").slice(0, ERROR_DETAIL_LIMIT) || null
              : null,
            ingestionCompletedAt: finalizedAt,
            updatedAt: finalizedAt,
          })
          .where(eq(projects.id, result.projectId));
      }
    }
    const githubFailures = githubResults.filter((result) => result.status === "failed").length;
    const githubPartials = githubResults.filter((result) => result.status === "partial").length;
    const sourceSnapshotAt = new Date().toISOString();
    // lastIndexedAt means "the gallery was walked at", so only a full import
    // advances it. Insights still recompute below on every import, targeted or
    // not, because adding a single project changes the hackathon-wide numbers.
    await publishHackathonProgress({
      indexingStage: "calculating_hacker_insights",
      indexingProgressCompleted: 0,
      indexingProgressTotal: 1,
      lastIndexedAt: sourceSnapshotAt,
      updatedAt: sourceSnapshotAt,
    });
    await options.onProgress?.({ type: "insights", status: "running", error: null });
    const insightResult = await calculateHackerInsights({
      hackathonId: hackathon.id,
      sourceLastIndexedAt: sourceSnapshotAt,
    });
    await options.onProgress?.({
      type: "insights",
      status: insightResult.status,
      error: insightResult.error,
    });
    // Usable (imported) projects exclude both detail-scrape and GitHub failures.
    const importedProjects = persistedProjects.length - detailFailures - githubFailures;
    const status = detailFailures > 0
      || imageFailures > 0
      || githubFailures > 0
      || githubPartials > 0
      || insightResult.status === "failed"
      ? "partial"
      : "succeeded";
    const completedAt = new Date().toISOString();
    await publishHackathonProgress({
      indexingStatus: status,
      indexingStage: null,
      indexingProgressCompleted: githubResults.length,
      indexingProgressTotal: githubProjects.length,
      lastIndexedAt: sourceSnapshotAt,
      updatedAt: completedAt,
    });

    return {
      hackathonId: hackathon.id,
      hackathon: metadata.name,
      status,
      imported: importedProjects,
      failedDetails: detailFailures,
      failedImages: imageFailures,
      githubRepositories: githubResults.length,
      failedGithubRepositories: githubFailures,
      partialGithubRepositories: githubPartials,
      hackerInsights: insightResult.status,
      availableProjects: metadata.projectCount,
    };
  } catch (error) {
    // A targeted import failing says nothing about the gallery as a whole, so it
    // must not mark the hackathon failed; the caller records the request failure.
    await publishHackathonProgress({
      indexingStatus: "failed",
      indexingStage: null,
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}
