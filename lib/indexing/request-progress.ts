import { eq } from "drizzle-orm";

import { db } from "@/db";
import { indexingRequests } from "@/db/schema";
import type { ImportProgress } from "@/lib/scraper/import-hackathon";

// Called from a task's onFailure hook, which fires only after every retry is
// exhausted. Marking the row failed inside the run function instead would flip
// it to "failed" between attempts, and realtime would push that to the UI.
export async function markIndexingRequestFailed(requestId: string) {
  const failedAt = new Date().toISOString();
  await db
    .update(indexingRequests)
    .set({ status: "failed", completedAt: failedAt, updatedAt: failedAt })
    .where(eq(indexingRequests.id, requestId));
}

export async function updateIndexingRequestProgress(
  requestId: string,
  progress: ImportProgress,
) {
  let stage: string;
  let completed: number;
  let total: number;

  if (progress.type === "gallery") {
    stage = "Discovering projects";
    completed = progress.discovered;
    total = progress.total;
  } else if (progress.type === "project") {
    stage = "Indexing projects";
    completed = progress.completed;
    total = progress.total;
  } else if (progress.type === "github") {
    stage = "Analyzing repositories";
    completed = progress.completed;
    total = progress.total;
  } else {
    stage = "Calculating insights";
    completed = progress.status === "running" ? 0 : 1;
    total = 1;
  }

  await db
    .update(indexingRequests)
    .set({
      progressStage: stage,
      progressCompleted: completed,
      progressTotal: total,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(indexingRequests.id, requestId));
}
