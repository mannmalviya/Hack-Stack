import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { indexingRequests } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type IndexingRequestItem = {
  id: string;
  submittedUrl: string;
  normalizedUrl: string;
  sourceType: "hackathon" | "project";
  status: "pending" | "queued" | "running" | "ready" | "rejected" | "failed";
  destinationPath: string | null;
  createdAt: string;
  updatedAt: string;
  progressStage: string | null;
  progressCompleted: number;
  progressTotal: number | null;
};

const requestSelection = {
  id: indexingRequests.id,
  submittedUrl: indexingRequests.submittedUrl,
  normalizedUrl: indexingRequests.normalizedUrl,
  sourceType: indexingRequests.sourceType,
  status: indexingRequests.status,
  destinationPath: indexingRequests.destinationPath,
  createdAt: indexingRequests.createdAt,
  updatedAt: indexingRequests.updatedAt,
  progressStage: indexingRequests.progressStage,
  progressCompleted: indexingRequests.progressCompleted,
  progressTotal: indexingRequests.progressTotal,
};

export async function getIndexingRequestPageData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, isAnonymous: true, requests: [] as IndexingRequestItem[] };
  }

  const rows = await db
    .select(requestSelection)
    .from(indexingRequests)
    .where(eq(indexingRequests.submittedBy, user.id))
    .orderBy(desc(indexingRequests.createdAt));

  return {
    userId: user.id,
    isAnonymous: user.is_anonymous === true,
    requests: rows.map((row) => ({
      ...row,
      sourceType: row.sourceType as IndexingRequestItem["sourceType"],
      status: row.status as IndexingRequestItem["status"],
    })),
  };
}
