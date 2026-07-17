import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { projectRepositories } from "./project-repositories";

// Current file metadata for a project repository; source contents are not stored.
export const repositoryFiles = privateSchema
  .table(
    "repository_files",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectRepositoryId: bigint("project_repository_id", {
        mode: "number",
      }).notNull(),
      path: text().notNull(),
      blobSha: text("blob_sha").notNull(),
      indexedCommitSha: text("indexed_commit_sha").notNull(),
      language: text(),
      sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
      lineCount: integer("line_count"),
      isBinary: boolean("is_binary").default(false).notNull(),
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
        name: "repository_files_project_repository_id_fkey",
      }).onDelete("cascade"),
      unique("repository_files_project_repository_path_unique").on(
        table.projectRepositoryId,
        table.path,
      ),
      check(
        "repository_files_size_bytes_nonnegative",
        sql`${table.sizeBytes} >= 0`,
      ),
      check(
        "repository_files_line_count_nonnegative",
        sql`${table.lineCount} is null or ${table.lineCount} >= 0`,
      ),
      index("repository_files_project_repository_language_idx").on(
        table.projectRepositoryId,
        table.language,
      ),
    ],
  )
  .enableRLS();

export type RepositoryFile = typeof repositoryFiles.$inferSelect;
export type NewRepositoryFile = typeof repositoryFiles.$inferInsert;
