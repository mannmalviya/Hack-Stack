import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { projectRepositories } from "./project-repositories";

// Lifecycle and outcome of one attempt to verify a project's claimed features
// against its cloned source. Each run owns a set of per-feature result rows.
export const featureVerificationRuns = privateSchema
  .table(
    "feature_verification_runs",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectRepositoryId: bigint("project_repository_id", {
        mode: "number",
      }).notNull(),
      status: text().default("queued").notNull(),
      // HEAD of the shallow clone the verification ran against.
      resolvedCommitSha: text("resolved_commit_sha"),
      // Number of claimed features returned, recorded for quick reporting.
      featureCount: bigint("feature_count", { mode: "number" }),
      startedAt: timestamp("started_at", {
        withTimezone: true,
        mode: "string",
      }),
      completedAt: timestamp("completed_at", {
        withTimezone: true,
        mode: "string",
      }),
      errorDetail: text("error_detail"),
      createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      foreignKey({
        columns: [table.projectRepositoryId],
        foreignColumns: [projectRepositories.id],
        name: "feature_verification_runs_project_repository_id_fkey",
      }).onDelete("cascade"),
      check(
        "feature_verification_runs_status_check",
        sql`${table.status} in ('queued', 'running', 'succeeded', 'partial', 'failed')`,
      ),
      index("feature_verification_runs_project_repository_created_at_idx").on(
        table.projectRepositoryId,
        table.createdAt.desc(),
      ),
      index("feature_verification_runs_status_created_at_idx").on(
        table.status,
        table.createdAt,
      ),
      index("feature_verification_runs_project_repository_status_idx").on(
        table.projectRepositoryId,
        table.status,
      ),
    ],
  )
  .enableRLS();

export type FeatureVerificationRun = typeof featureVerificationRuns.$inferSelect;
export type NewFeatureVerificationRun =
  typeof featureVerificationRuns.$inferInsert;
