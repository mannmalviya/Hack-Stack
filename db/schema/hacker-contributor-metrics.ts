import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { hackerTeamMetrics } from "./hacker-team-metrics";

// Full commit credit for a GitHub-resolved primary author or co-author on one project.
export const hackerContributorMetrics = privateSchema
  .table(
    "hacker_contributor_metrics",
    {
      runId: bigint("run_id", { mode: "number" }).notNull(),
      projectId: uuid("project_id").notNull(),
      githubUserId: bigint("github_user_id", { mode: "number" }).notNull(),
      githubLogin: text("github_login").notNull(),
      displayName: text("display_name").notNull(),
      creditedCommitCount: bigint("credited_commit_count", { mode: "number" })
        .default(0)
        .notNull(),
      creditedAdditions: bigint("credited_additions", { mode: "number" })
        .default(0)
        .notNull(),
      creditedDeletions: bigint("credited_deletions", { mode: "number" })
        .default(0)
        .notNull(),
    },
    (table) => [
      primaryKey({
        columns: [table.runId, table.projectId, table.githubUserId],
        name: "hacker_contributor_metrics_pkey",
      }),
      foreignKey({
        columns: [table.runId, table.projectId],
        foreignColumns: [hackerTeamMetrics.runId, hackerTeamMetrics.projectId],
        name: "hacker_contributor_metrics_team_fkey",
      }).onDelete("cascade"),
      check(
        "hacker_contributor_metrics_identity_check",
        sql`${table.githubUserId} > 0
          and nullif(btrim(${table.githubLogin}), '') is not null
          and nullif(btrim(${table.displayName}), '') is not null`,
      ),
      check(
        "hacker_contributor_metrics_nonnegative_check",
        sql`${table.creditedCommitCount} >= 0
          and ${table.creditedAdditions} >= 0
          and ${table.creditedDeletions} >= 0`,
      ),
    ],
  )
  .enableRLS();

export type HackerContributorMetric = typeof hackerContributorMetrics.$inferSelect;
export type NewHackerContributorMetric = typeof hackerContributorMetrics.$inferInsert;
