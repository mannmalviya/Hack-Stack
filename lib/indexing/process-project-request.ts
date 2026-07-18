import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, indexingRequests, projects } from "@/db/schema";
import {
  normalizeProjectUrl,
  parseProjectHackathonUrl,
} from "@/lib/scraper/devpost";
import { projectUrlGuard, fetchHtml } from "@/lib/scraper/fetch";
import { importHackathon } from "@/lib/scraper/import-hackathon";
import { updateIndexingRequestProgress } from "@/lib/indexing/request-progress";

export async function processProjectIndexingRequest(requestId: string) {
  const [request] = await db
    .select({
      id: indexingRequests.id,
      sourceType: indexingRequests.sourceType,
      normalizedUrl: indexingRequests.normalizedUrl,
      status: indexingRequests.status,
    })
    .from(indexingRequests)
    .where(eq(indexingRequests.id, requestId))
    .limit(1);

  if (!request || request.sourceType !== "project") {
    throw new Error("Project indexing request was not found");
  }
  if (request.status === "ready") return;

  const normalizedProjectUrl = normalizeProjectUrl(request.normalizedUrl);
  if (!normalizedProjectUrl) throw new Error("Stored project URL is invalid");

  await db
    .update(indexingRequests)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(indexingRequests.id, request.id));

  // Failures propagate to the task's onFailure hook, which marks the request
  // failed only after retries are exhausted.
  const projectHtml = await fetchHtml(normalizedProjectUrl, projectUrlGuard);
  const hackathonUrl = parseProjectHackathonUrl(projectHtml);
  const result = await importHackathon(hackathonUrl, {
    limit: "all",
    projectUrl: normalizedProjectUrl,
    onProgress: (progress) => updateIndexingRequestProgress(request.id, progress),
  });
  const [indexedProject] = await db
    .select({ id: projects.id, hackathonSlug: hackathons.devpostSlug })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(
      eq(projects.hackathonId, result.hackathonId),
      eq(projects.devpostUrl, normalizedProjectUrl),
    ))
    .limit(1);
  if (!indexedProject) throw new Error("Indexed project could not be resolved");

  const completedAt = new Date().toISOString();
  await db
    .update(indexingRequests)
    .set({
      status: "ready",
      hackathonId: result.hackathonId,
      projectId: indexedProject.id,
      destinationPath: `/hackathons/${indexedProject.hackathonSlug}?view=projects`,
      completedAt,
      updatedAt: completedAt,
      progressStage: "Complete",
    })
    .where(eq(indexingRequests.id, request.id));
}
