import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Approved Devpost events that HackStack has indexed or is preparing to index.
export const hackathons = pgTable(
  "hackathons",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    devpostUrl: text("devpost_url").notNull(),
    devpostSlug: text("devpost_slug").notNull(),
    name: text().notNull(),
    organizer: text(),
    description: text(),
    coverImageSourceUrl: text("cover_image_source_url"),
    coverImagePath: text("cover_image_path"),
    coverImageFetchedAt: timestamp("cover_image_fetched_at", {
      withTimezone: true,
      mode: "string",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    projectCount: integer("project_count"),
    indexingStatus: text("indexing_status").default("queued").notNull(),
    indexingStage: text("indexing_stage"),
    indexingProgressCompleted: integer("indexing_progress_completed")
      .default(0)
      .notNull(),
    indexingProgressTotal: integer("indexing_progress_total"),
    lastIndexedAt: timestamp("last_indexed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Import workers frequently filter by this state when claiming queued work.
    index("hackathons_indexing_status_idx").using(
      "btree",
      table.indexingStatus.asc().nullsLast().op("text_ops"),
    ),
    unique("hackathons_devpost_url_unique").on(table.devpostUrl),
    unique("hackathons_devpost_slug_unique").on(table.devpostSlug),
    // Keep persisted values aligned with the background-job state machine.
    check(
      "hackathons_indexing_status_check",
      sql`indexing_status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'partial'::text, 'failed'::text])`,
    ),
    check(
      "hackathons_indexing_stage_check",
      sql`${table.indexingStage} is null or ${table.indexingStage} in ('discovering_projects', 'scraping_projects', 'ingesting_repositories', 'calculating_hacker_insights')`,
    ),
    check(
      "hackathons_indexing_progress_completed_nonnegative",
      sql`${table.indexingProgressCompleted} >= 0`,
    ),
    check(
      "hackathons_indexing_progress_total_nonnegative",
      sql`${table.indexingProgressTotal} is null or ${table.indexingProgressTotal} >= 0`,
    ),
    check(
      "hackathons_indexing_progress_bounds",
      sql`${table.indexingProgressTotal} is null or ${table.indexingProgressCompleted} <= ${table.indexingProgressTotal}`,
    ),
    check(
      "hackathons_cover_image_storage_check",
      sql`(cover_image_path is null and cover_image_fetched_at is null) or (nullif(btrim(cover_image_path), '') is not null and cover_image_fetched_at is not null)`,
    ),
  ],
).enableRLS();

// Row shapes inferred from the table definition for reads and inserts.
export type Hackathon = typeof hackathons.$inferSelect;
export type NewHackathon = typeof hackathons.$inferInsert;
