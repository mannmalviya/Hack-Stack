"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { projectStars } from "@/db/schema";
import { getSignedInUserId } from "@/lib/auth/current-user";

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

  revalidatePath("/starred");
  return { outcome: "success", starred };
}
