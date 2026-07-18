import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

import { hackerInsightRuns } from "./hacker-insight-runs";
import { privateSchema } from "./github-repositories";
import { projects } from "./projects";

// Commit activity counted once per Devpost project, regardless of author count.
export const hackerTeamMetrics = privateSchema
  .table(
    "hacker_team_metrics",
    {
      runId: bigint("run_id", { mode: "number" }).notNull(),
      projectId: uuid("project_id").notNull(),
      commitCount: bigint("commit_count", { mode: "number" }).default(0).notNull(),
      additions: bigint({ mode: "number" }).default(0).notNull(),
      deletions: bigint({ mode: "number" }).default(0).notNull(),
    },
    (table) => [
      primaryKey({
        columns: [table.runId, table.projectId],
        name: "hacker_team_metrics_pkey",
      }),
      foreignKey({
        columns: [table.runId],
        foreignColumns: [hackerInsightRuns.id],
        name: "hacker_team_metrics_run_id_fkey",
      }).onDelete("cascade"),
      foreignKey({
        columns: [table.projectId],
        foreignColumns: [projects.id],
        name: "hacker_team_metrics_project_id_fkey",
      }).onDelete("cascade"),
      check(
        "hacker_team_metrics_nonnegative_check",
        sql`${table.commitCount} >= 0
          and ${table.additions} >= 0
          and ${table.deletions} >= 0`,
      ),
    ],
  )
  .enableRLS();

export type HackerTeamMetric = typeof hackerTeamMetrics.$inferSelect;
export type NewHackerTeamMetric = typeof hackerTeamMetrics.$inferInsert;
