import { eq } from "drizzle-orm";

import { db } from "@/db";
import { hackathons, indexingRequests } from "@/db/schema";
import {
  shouldProcessHackathonRequest,
  type ApprovalStatus,
} from "@/lib/indexing/admin-approval";
import { updateIndexingRequestProgress } from "@/lib/indexing/request-progress";
import { importHackathon } from "@/lib/scraper/import-hackathon";

export async function processHackathonIndexingRequest(requestId: string) {
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
  if (!request || request.sourceType !== "hackathon") {
    throw new Error("Hackathon indexing request was not found");
  }
  if (request.status === "ready") return;
  // A stale or duplicate dispatch must not bypass the admin approval state.
  if (!shouldProcessHackathonRequest(request.status as ApprovalStatus)) return;

  await db
    .update(indexingRequests)
    .set({ status: "running", updatedAt: new Date().toISOString() })
    .where(eq(indexingRequests.id, request.id));
  // Failures propagate to the task's onFailure hook, which marks the request
  // failed only after retries are exhausted.
  const result = await importHackathon(request.normalizedUrl, {
    limit: "all",
    onProgress: (progress) => updateIndexingRequestProgress(request.id, progress),
  });
  // Read the slug the import actually persisted rather than re-deriving it from
  // the submitted hostname, which would 404 if the two ever diverge.
  const [indexedHackathon] = await db
    .select({ slug: hackathons.devpostSlug })
    .from(hackathons)
    .where(eq(hackathons.id, result.hackathonId))
    .limit(1);
  if (!indexedHackathon) throw new Error("Indexed hackathon could not be resolved");

  const completedAt = new Date().toISOString();
  await db
    .update(indexingRequests)
    .set({
      status: "ready",
      hackathonId: result.hackathonId,
      destinationPath: `/hackathons/${indexedHackathon.slug}`,
      progressStage: "Complete",
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(indexingRequests.id, request.id));
}
