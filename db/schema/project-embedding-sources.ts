import { sql } from "drizzle-orm";
import { check, foreignKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { projects } from "./projects";

// Devpost story sections that make a project eligible for similarity indexing.
export const projectEmbeddingSources = privateSchema
  .table(
    "project_embedding_sources",
    {
      projectId: uuid("project_id").primaryKey().notNull(),
      inspiration: text().notNull(),
      whatItDoes: text("what_it_does").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      foreignKey({
        columns: [table.projectId],
        foreignColumns: [projects.id],
        name: "project_embedding_sources_project_id_fkey",
      }).onDelete("cascade"),
      check(
        "project_embedding_sources_nonblank_check",
        sql`nullif(btrim(${table.inspiration}), '') is not null
          and nullif(btrim(${table.whatItDoes}), '') is not null`,
      ),
    ],
  )
  .enableRLS();

export type ProjectEmbeddingSource = typeof projectEmbeddingSources.$inferSelect;
export type NewProjectEmbeddingSource = typeof projectEmbeddingSources.$inferInsert;
