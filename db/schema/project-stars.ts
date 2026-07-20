import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { projects } from "./projects";

// Projects a signed-in user saved for later. The pair is the identity: a user
// either stars a project or does not, so there is no surrogate key and a
// repeat star is a primary-key conflict rather than a duplicate row.
export const projectStars = pgTable(
  "project_stars",
  {
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "project_stars_project_id_fkey",
    }).onDelete("cascade"),
    // The starred page lists a user's stars newest first.
    index("project_stars_user_id_created_at_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    // The user_id foreign key to auth.users(id) on delete cascade is
    // intentionally absent here, matching indexing_requests: declaring it would
    // make drizzle-kit try to manage Supabase's auth schema. The SQL migration
    // owns it.
    //
    // `(select auth.uid())` rather than a bare call so Postgres caches it as an
    // initplan instead of re-evaluating per row.
    pgPolicy("Users can read their stars", {
      for: "select",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = user_id`,
    }),
    pgPolicy("Users can star projects", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(select auth.uid()) = user_id`,
    }),
    pgPolicy("Users can remove their stars", {
      for: "delete",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = user_id`,
    }),
  ],
).enableRLS();

export type ProjectStar = typeof projectStars.$inferSelect;
export type NewProjectStar = typeof projectStars.$inferInsert;
