"use server";

import { tasks } from "@trigger.dev/sdk";
import { and, count, desc, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { indexingRequests } from "@/db/schema";
import type { IndexingRequestItem } from "@/lib/data/indexing-requests";
import { normalizeHackathonUrl, normalizeProjectUrl } from "@/lib/scraper/devpost";
import { createClient } from "@/lib/supabase/server";
import type { indexDevpostProject } from "@/trigger/index-project";

const requestSchema = z.object({
  url: z.string().trim().min(1, "Enter a Devpost URL").max(2048, "URL is too long"),
});

export type SubmitIndexingRequestState = {
  outcome: "idle" | "success" | "error";
  message?: string;
  userId?: string;
  request?: IndexingRequestItem;
};

function classifyUrl(input: string) {
  const projectUrl = normalizeProjectUrl(input);
  if (projectUrl) return { sourceType: "project" as const, normalizedUrl: projectUrl };
  try {
    const hackathon = normalizeHackathonUrl(input);
    return { sourceType: "hackathon" as const, normalizedUrl: hackathon.devpostUrl };
  } catch {
    throw new Error(
      "Enter a Devpost hackathon URL or https://devpost.com/software/project URL",
    );
  }
}

function toItem(row: typeof indexingRequests.$inferSelect): IndexingRequestItem {
  return {
    id: row.id,
    submittedUrl: row.submittedUrl,
    normalizedUrl: row.normalizedUrl,
    sourceType: row.sourceType as IndexingRequestItem["sourceType"],
    status: row.status as IndexingRequestItem["status"],
    destinationPath: row.destinationPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    progressStage: row.progressStage,
    progressCompleted: row.progressCompleted,
    progressTotal: row.progressTotal,
  };
}

export async function submitIndexingRequest(
  _previousState: SubmitIndexingRequestState,
  formData: FormData,
): Promise<SubmitIndexingRequestState> {
  const parsed = requestSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { outcome: "error", message: parsed.error.issues[0]?.message };
  }

  let source: ReturnType<typeof classifyUrl>;
  try {
    source = classifyUrl(parsed.data.url);
  } catch (error) {
    return {
      outcome: "error",
      message: error instanceof Error ? error.message : "Invalid Devpost URL",
    };
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  let user = currentUser.data.user;
  const userError = currentUser.error;
  if (userError || !user) {
    const anonymous = await supabase.auth.signInAnonymously();
    if (anonymous.error || !anonymous.data.user) {
      return {
        outcome: "error",
        message: "We couldn't start a guest session. Please try again.",
      };
    }
    user = anonymous.data.user;
  }

  const isAnonymous = user.is_anonymous === true;
  try {
    const request = await db.transaction(async (tx) => {
      // Serialize quota checks for this identity so parallel submissions cannot
      // race past the guest cap.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`,
      );

      const [duplicate] = await tx
        .select()
        .from(indexingRequests)
        .where(and(
          eq(indexingRequests.submittedBy, user.id),
          eq(indexingRequests.normalizedUrl, source.normalizedUrl),
          notInArray(indexingRequests.status, ["failed", "rejected"]),
        ))
        .orderBy(desc(indexingRequests.createdAt))
        .limit(1);
      if (duplicate) return duplicate;

      if (isAnonymous) {
        // Failed and rejected requests do not consume quota — they produced no
        // import, and the duplicate check above already lets the user retry the
        // same URL. Counting them would permanently lock a guest out.
        const statusFilter = source.sourceType === "hackathon"
          ? and(
              eq(indexingRequests.sourceType, "hackathon"),
              eq(indexingRequests.status, "pending"),
            )
          : and(
              eq(indexingRequests.sourceType, "project"),
              notInArray(indexingRequests.status, ["failed", "rejected"]),
            );
        const [usage] = await tx
          .select({ value: count() })
          .from(indexingRequests)
          .where(and(eq(indexingRequests.submittedBy, user.id), statusFilter));
        const limit = source.sourceType === "hackathon" ? 5 : 10;
        if (usage.value >= limit) {
          throw new Error(
            source.sourceType === "hackathon"
              ? "Guests can keep up to 5 hackathon requests pending."
              : "Guests can import up to 10 individual projects.",
          );
        }
      }

      const [created] = await tx
        .insert(indexingRequests)
        .values({
          submittedUrl: parsed.data.url,
          normalizedUrl: source.normalizedUrl,
          sourceType: source.sourceType,
          status: source.sourceType === "hackathon" ? "pending" : "queued",
          submittedBy: user.id,
        })
        .returning();
      return created;
    });

    if (source.sourceType === "project" && request.status === "queued") {
      try {
        if (!process.env.TRIGGER_SECRET_KEY) {
          throw new Error("background indexing is not configured");
        }
        await tasks.trigger<typeof indexDevpostProject>(
          "index-devpost-project",
          { requestId: request.id },
          { idempotencyKey: request.id },
        );
      } catch (dispatchError) {
        // The row is already committed, and nothing polls for 'queued' rows, so
        // a failed dispatch has to be recorded here or the request is stranded.
        const failedAt = new Date().toISOString();
        await db
          .update(indexingRequests)
          .set({ status: "failed", completedAt: failedAt, updatedAt: failedAt })
          .where(eq(indexingRequests.id, request.id));
        return {
          outcome: "error",
          userId: user.id,
          message: dispatchError instanceof Error
            ? `Couldn't start indexing: ${dispatchError.message}.`
            : "Couldn't start indexing this project.",
        };
      }
    }

    return {
      outcome: "success",
      userId: user.id,
      request: toItem(request),
      message: source.sourceType === "hackathon"
        ? "Hackathon submitted for approval."
        : "Project queued for indexing.",
    };
  } catch (error) {
    return {
      outcome: "error",
      message: error instanceof Error ? error.message : "Unable to submit this URL.",
    };
  }
}
