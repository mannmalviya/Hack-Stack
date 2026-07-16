import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { hackathons } from "./hackathons";

// User-submitted hackathon URLs waiting for an administrator's decision.
export const hackathonRequests = pgTable(
  "hackathon_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    submittedUrl: text("submitted_url").notNull(),
    status: text().default("pending").notNull(),
    submittedBy: uuid("submitted_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    approvedHackathonId: uuid("approved_hackathon_id"),
  },
  (table) => [
    // Supports looking up the request that produced an approved hackathon.
    index("hackathon_requests_approved_hackathon_id_idx").using(
      "btree",
      table.approvedHackathonId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.approvedHackathonId],
      foreignColumns: [hackathons.id],
      name: "hackathon_requests_approved_hackathon_id_fkey",
      // Retain the original request even if its indexed hackathon is removed.
    }).onDelete("set null"),
    // Requests must remain in one of the three administrator workflow states.
    check(
      "hackathon_requests_status_check",
      sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`,
    ),
  ],
).enableRLS();

// Row shapes inferred from the table definition for reads and inserts.
export type HackathonRequest = typeof hackathonRequests.$inferSelect;
export type NewHackathonRequest = typeof hackathonRequests.$inferInsert;
