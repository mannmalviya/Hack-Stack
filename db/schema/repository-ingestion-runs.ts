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

// Lifecycle and outcome of one attempt to ingest a project's GitHub repository.
export const repositoryIngestionRuns = privateSchema
  .table(
    "repository_ingestion_runs",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectRepositoryId: bigint("project_repository_id", {
        mode: "number",
      }).notNull(),
      status: text().default("queued").notNull(),
      requestedRef: text("requested_ref"),
      resolvedCommitSha: text("resolved_commit_sha"),
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
        name: "repository_ingestion_runs_project_repository_id_fkey",
      }).onDelete("cascade"),
      check(
        "repository_ingestion_runs_status_check",
        sql`${table.status} in ('queued', 'running', 'succeeded', 'partial', 'failed')`,
      ),
      index("repository_ingestion_runs_project_repository_created_at_idx").on(
        table.projectRepositoryId,
        table.createdAt.desc(),
      ),
      index("repository_ingestion_runs_status_created_at_idx").on(
        table.status,
        table.createdAt,
      ),
    ],
  )
  .enableRLS();

export type RepositoryIngestionRun = typeof repositoryIngestionRuns.$inferSelect;
export type NewRepositoryIngestionRun = typeof repositoryIngestionRuns.$inferInsert;
