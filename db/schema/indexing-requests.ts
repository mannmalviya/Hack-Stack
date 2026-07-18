import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { hackathons } from "./hackathons";
import { projects } from "./projects";

// User-owned Devpost URLs moving through approval or immediate indexing.
export const indexingRequests = pgTable(
  "indexing_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    submittedUrl: text("submitted_url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    sourceType: text("source_type").notNull(),
    status: text().default("pending").notNull(),
    submittedBy: uuid("submitted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    hackathonId: uuid("hackathon_id"),
    projectId: uuid("project_id"),
    destinationPath: text("destination_path"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    progressStage: text("progress_stage"),
    progressCompleted: integer("progress_completed").default(0).notNull(),
    progressTotal: integer("progress_total"),
  },
  (table) => [
    index("indexing_requests_hackathon_id_idx").using(
      "btree",
      table.hackathonId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.hackathonId],
      foreignColumns: [hackathons.id],
      name: "indexing_requests_hackathon_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "indexing_requests_project_id_fkey",
    }).onDelete("set null"),
    index("indexing_requests_submitted_by_idx").on(table.submittedBy),
    index("indexing_requests_submitted_by_created_at_idx").on(
      table.submittedBy,
      table.createdAt,
    ),
    index("indexing_requests_source_status_idx").on(
      table.sourceType,
      table.status,
    ),
    index("indexing_requests_normalized_url_idx").on(table.normalizedUrl),
    // Mirrors indexing_requests_normalized_url_check. The submitted_by foreign
    // key to auth.users(id) on delete cascade is intentionally absent: auth is
    // outside this schema, and declaring it here would make drizzle-kit try to
    // manage Supabase's auth schema. It is owned by the SQL migration.
    check(
      "indexing_requests_normalized_url_check",
      sql`(source_type = 'hackathon' and normalized_url ~ '^https://[a-z0-9-]+\.devpost\.com/$') or (source_type = 'project' and normalized_url ~ '^https://devpost\.com/software/[^/?#]+$')`,
    ),
    check(
      "indexing_requests_source_type_check",
      sql`source_type = ANY (ARRAY['hackathon'::text, 'project'::text])`,
    ),
    check(
      "indexing_requests_status_check",
      sql`status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'ready'::text, 'rejected'::text, 'failed'::text])`,
    ),
    check(
      "indexing_requests_destination_path_check",
      sql`destination_path is null or destination_path like '/hackathons/%'`,
    ),
    check(
      "indexing_requests_progress_nonnegative_check",
      sql`progress_completed >= 0 and (progress_total is null or progress_total >= 0)`,
    ),
    check(
      "indexing_requests_progress_bounds_check",
      sql`progress_total is null or progress_completed <= progress_total`,
    ),
  ],
).enableRLS();

export type IndexingRequest = typeof indexingRequests.$inferSelect;
export type NewIndexingRequest = typeof indexingRequests.$inferInsert;
