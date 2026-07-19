import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { hackathons } from "./hackathons";
import { privateSchema } from "./github-repositories";

// One immutable source snapshot used to publish a complete set of Hacker Insights.
export const hackerInsightRuns = privateSchema
  .table(
    "hacker_insight_runs",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      hackathonId: uuid("hackathon_id").notNull(),
      sourceLastIndexedAt: timestamp("source_last_indexed_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      windowStartsAt: timestamp("window_starts_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      windowEndsAt: timestamp("window_ends_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      status: text().default("queued").notNull(),
      startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
      completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
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
        columns: [table.hackathonId],
        foreignColumns: [hackathons.id],
        name: "hacker_insight_runs_hackathon_id_fkey",
      }).onDelete("cascade"),
      unique("hacker_insight_runs_source_unique").on(
        table.hackathonId,
        table.sourceLastIndexedAt,
      ),
      check(
        "hacker_insight_runs_status_check",
        sql`${table.status} in ('queued', 'running', 'succeeded', 'failed')`,
      ),
      check(
        "hacker_insight_runs_window_check",
        sql`${table.windowEndsAt} >= ${table.windowStartsAt}`,
      ),
      check(
        "hacker_insight_runs_lifecycle_check",
        sql`(
          (${table.status} = 'queued' and ${table.startedAt} is null and ${table.completedAt} is null and ${table.errorDetail} is null)
          or (${table.status} = 'running' and ${table.startedAt} is not null and ${table.completedAt} is null and ${table.errorDetail} is null)
          or (${table.status} = 'succeeded' and ${table.startedAt} is not null and ${table.completedAt} is not null and ${table.errorDetail} is null)
          or (${table.status} = 'failed' and ${table.startedAt} is not null and ${table.completedAt} is not null and nullif(btrim(${table.errorDetail}), '') is not null)
        )`,
      ),
      index("hacker_insight_runs_hackathon_status_completed_idx").on(
        table.hackathonId,
        table.status,
        table.completedAt.desc().nullsFirst(),
      ),
    ],
  )
  .enableRLS();

export type HackerInsightRun = typeof hackerInsightRuns.$inferSelect;
export type NewHackerInsightRun = typeof hackerInsightRuns.$inferInsert;
