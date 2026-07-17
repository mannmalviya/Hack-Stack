import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { hackathons } from "./hackathons";

// Devpost submissions imported as evidence-bearing projects for judges to inspect.
export const projects = pgTable(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    hackathonId: uuid("hackathon_id").notNull(),
    devpostUrl: text("devpost_url").notNull(),
    devpostSlug: text("devpost_slug").notNull(),
    name: text().notNull(),
    tagline: text(),
    coverImageSourceUrl: text("cover_image_source_url"),
    coverImagePath: text("cover_image_path"),
    coverImageFetchedAt: timestamp("cover_image_fetched_at", {
      withTimezone: true,
      mode: "string",
    }),
    description: text(),
    demoUrl: text("demo_url"),
    videoUrl: text("video_url"),
    githubUrl: text("github_url"),
    // Award metadata is separate from judging and records only published results.
    isWinner: boolean("is_winner").default(false).notNull(),
    winningTrack: text("winning_track"),
    // Arrays are stored as JSONB because Devpost team and technology records
    // can evolve without requiring a column for every scraped field.
    teamData: jsonb("team_data").default([]).notNull(),
    builtWithData: jsonb("built_with_data").default([]).notNull(),
    ingestionCompletedAt: timestamp("ingestion_completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    // Outcome of the most recent import attempt. `failed` rows are kept (never
    // deleted) so judges can review them, and are retried on the next import.
    ingestionStatus: text("ingestion_status").default("pending").notNull(),
    ingestionError: text("ingestion_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Project lists are normally loaded within a single hackathon.
    index("projects_hackathon_id_idx").using(
      "btree",
      table.hackathonId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.hackathonId],
      foreignColumns: [hackathons.id],
      name: "projects_hackathon_id_fkey",
      // Projects have no meaning after their parent hackathon is removed.
    }).onDelete("cascade"),
    // A Devpost slug only needs to be unique inside its source hackathon.
    unique("projects_hackathon_slug_unique").on(
      table.hackathonId,
      table.devpostSlug,
    ),
    // Winner status and track must always describe the same published result.
    check(
      "projects_winner_track_check",
      sql`(${table.isWinner} and nullif(btrim(${table.winningTrack}), '') is not null) or (not ${table.isWinner} and ${table.winningTrack} is null)`,
    ),
    // Ingestion state machine mirrored on each project row.
    check(
      "projects_ingestion_status_check",
      sql`${table.ingestionStatus} in ('pending', 'succeeded', 'partial', 'failed')`,
    ),
  ],
).enableRLS();

// Row shapes inferred from the table definition for reads and inserts.
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
