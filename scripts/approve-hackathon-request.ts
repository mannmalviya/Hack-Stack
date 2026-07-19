import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { config } from "dotenv";

import {
  approvePendingRequest,
  type ApprovalStatus,
} from "../lib/indexing/admin-approval";
import type { indexDevpostHackathon } from "../trigger/index-hackathon";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function databaseTarget(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.slice(1)}`;
  } catch {
    throw new Error("DATABASE_URL is invalid");
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Request approval requires an interactive terminal");
  }

  const databaseUrl = requiredEnvironment("DATABASE_URL");
  requiredEnvironment("TRIGGER_SECRET_KEY");
  const triggerProject = process.env.TRIGGER_PROJECT_REF ?? "proj_hackstack";

  console.log("Hackathon request approval");
  console.log(`Database: ${databaseTarget(databaseUrl)}`);
  console.log(`Trigger.dev project: ${triggerProject}`);

  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const environmentConfirmation = await prompt.question(
      'Type "continue" to use this environment: ',
    );
    if (environmentConfirmation.trim().toLowerCase() !== "continue") {
      console.log("Approval cancelled.");
      return;
    }

    const [{ and, asc, eq }, { db, databaseClient }, { indexingRequests }] =
      await Promise.all([
        import("drizzle-orm"),
        import("../db"),
        import("../db/schema"),
      ]);

    try {
      const pendingRequests = await db
        .select({
          id: indexingRequests.id,
          normalizedUrl: indexingRequests.normalizedUrl,
          createdAt: indexingRequests.createdAt,
        })
        .from(indexingRequests)
        .where(and(
          eq(indexingRequests.sourceType, "hackathon"),
          eq(indexingRequests.status, "pending"),
        ))
        .orderBy(asc(indexingRequests.createdAt));

      if (pendingRequests.length === 0) {
        console.log("No pending hackathon requests.");
        return;
      }

      console.log("\nPending hackathon requests:");
      pendingRequests.forEach((request, index) => {
        console.log(`${index + 1}. ${request.normalizedUrl} (${request.createdAt})`);
      });

      const selection = await prompt.question("\nSelect a request number (or q to quit): ");
      if (selection.trim().toLowerCase() === "q") {
        console.log("Approval cancelled.");
        return;
      }

      const selectedIndex = Number(selection) - 1;
      const request = Number.isInteger(selectedIndex)
        ? pendingRequests[selectedIndex]
        : undefined;
      if (!request) throw new Error("Invalid request selection");

      console.log(`\nURL: ${request.normalizedUrl}`);
      console.log(`Submitted: ${request.createdAt}`);
      console.log(`Request ID: ${request.id}`);
      const confirmation = await prompt.question(
        'Type "approve" to index every project in this hackathon: ',
      );
      if (confirmation.trim().toLowerCase() !== "approve") {
        console.log("Approval cancelled.");
        return;
      }

      const reviewedAt = new Date().toISOString();
      const result = await approvePendingRequest(request.id, reviewedAt, {
        queue: async (requestId, timestamp) => {
          const rows = await db
            .update(indexingRequests)
            .set({ status: "queued", reviewedAt: timestamp, updatedAt: timestamp })
            .where(and(
              eq(indexingRequests.id, requestId),
              eq(indexingRequests.sourceType, "hackathon"),
              eq(indexingRequests.status, "pending"),
            ))
            .returning({ id: indexingRequests.id });
          return rows.length === 1;
        },
        dispatch: async (requestId) => {
          const { tasks } = await import("@trigger.dev/sdk");
          return tasks.trigger<typeof indexDevpostHackathon>(
            "index-devpost-hackathon",
            { requestId },
            {
              idempotencyKey: `approve-${requestId}-${randomUUID()}`,
              concurrencyKey: requestId,
            },
          );
        },
        rollback: async (requestId, timestamp) => {
          const rows = await db
            .update(indexingRequests)
            .set({ status: "pending", reviewedAt: null, updatedAt: new Date().toISOString() })
            .where(and(
              eq(indexingRequests.id, requestId),
              eq(indexingRequests.status, "queued"),
              eq(indexingRequests.reviewedAt, timestamp),
            ))
            .returning({ id: indexingRequests.id });
          return rows.length === 1;
        },
        readStatus: async (requestId) => {
          const [row] = await db
            .select({ status: indexingRequests.status })
            .from(indexingRequests)
            .where(eq(indexingRequests.id, requestId))
            .limit(1);
          return (row?.status as ApprovalStatus | undefined) ?? null;
        },
      });

      if (result.outcome === "approved") {
        console.log(`Approved and queued. Trigger.dev run: ${result.runId}`);
      } else if (result.outcome === "not_pending") {
        console.log("This request is no longer pending; nothing was changed.");
      } else if (result.outcome === "dispatch_failed") {
        throw new Error(
          `Trigger.dev dispatch failed; the request was returned to pending. ${errorMessage(result.error)}`,
        );
      } else {
        throw new Error(
          `Trigger.dev dispatch returned an error, but the request is now ${result.status ?? "missing"}; it was not rolled back. ${errorMessage(result.error)}`,
        );
      }
    } finally {
      await databaseClient.end();
    }
  } finally {
    prompt.close();
  }
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
