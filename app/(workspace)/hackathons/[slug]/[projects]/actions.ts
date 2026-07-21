"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { projectStars } from "@/db/schema";
import { getSignedInUserId } from "@/lib/auth/current-user";
import { getReelAnalysis, type ReelAnalysis } from "@/lib/data/reel-analysis";

const starSchema = z.object({
  projectId: z.uuid("Unknown project"),
  starred: z.boolean(),
});

export type SetProjectStarResult =
  | { outcome: "success"; starred: boolean }
  | { outcome: "error"; message: string };

/**
 * Stars or unstars a project for the signed-in user.
 *
 * Takes the desired end state rather than toggling, so a double-click or a
 * retried request settles on what the user asked for instead of flipping again.
 * Never throws: the button reverts its optimistic state on an error outcome.
 */
export async function setProjectStar(
  input: z.input<typeof starSchema>,
): Promise<SetProjectStarResult> {
  const parsed = starSchema.safeParse(input);
  if (!parsed.success) {
    return { outcome: "error", message: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const userId = await getSignedInUserId();
  if (!userId) {
    return { outcome: "error", message: "Sign in to star projects." };
  }

  const { projectId, starred } = parsed.data;
  try {
    if (starred) {
      await db
        .insert(projectStars)
        .values({ userId, projectId })
        // Already starred is the state the caller asked for, not a failure.
        .onConflictDoNothing();
    } else {
      await db
        .delete(projectStars)
        .where(and(
          eq(projectStars.userId, userId),
          eq(projectStars.projectId, projectId),
        ));
    }
  } catch {
    return { outcome: "error", message: "Couldn't save that. Please try again." };
  }

  // `/starred` is force-dynamic, so its next visit reads the mutation without
  // cache invalidation. Revalidating here clears Next's client router cache and
  // disrupts stateful feeds (especially Discover's randomized project order).
  return { outcome: "success", starred };
}

const reelAnalysisSchema = z.object({
  hackathonSlug: z.string().min(1),
  projectSlug: z.string().min(1),
});

export type LoadReelAnalysisResult =
  | { outcome: "success"; analysis: ReelAnalysis | null }
  | { outcome: "error" };

/**
 * Read-only fetch for the reel feeds' analysis side rails, called as the
 * active card changes. All of it is public indexed data, so no auth gate.
 */
export async function loadReelAnalysis(
  input: z.input<typeof reelAnalysisSchema>,
): Promise<LoadReelAnalysisResult> {
  const parsed = reelAnalysisSchema.safeParse(input);
  if (!parsed.success) return { outcome: "error" };

  try {
    const analysis = await getReelAnalysis(
      parsed.data.hackathonSlug,
      parsed.data.projectSlug,
    );
    return { outcome: "success", analysis };
  } catch {
    return { outcome: "error" };
  }
}
