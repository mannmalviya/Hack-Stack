import { sql } from "drizzle-orm";
import {
  bigint,
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

// Unique Git commits associated with a project's repository across all ingestions.
export const repositoryCommits = privateSchema
  .table(
    "repository_commits",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectRepositoryId: bigint("project_repository_id", {
        mode: "number",
      }).notNull(),
      commitSha: text("commit_sha").notNull(),
      authorName: text("author_name").notNull(),
      authorEmail: text("author_email").notNull(),
      authorGithubUserId: bigint("author_github_user_id", { mode: "number" }),
      authorGithubLogin: text("author_github_login"),
      authoredAt: timestamp("authored_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      committedAt: timestamp("committed_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      message: text().notNull(),
      parentShas: text("parent_shas")
        .array()
        .default(sql`'{}'::text[]`)
        .notNull(),
      additions: integer(),
      deletions: integer(),
      changedFiles: integer("changed_files"),
      createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      foreignKey({
        columns: [table.projectRepositoryId],
        foreignColumns: [projectRepositories.id],
        name: "repository_commits_project_repository_id_fkey",
      }).onDelete("cascade"),
      unique("repository_commits_project_repository_sha_unique").on(
        table.projectRepositoryId,
        table.commitSha,
      ),
      check(
        "repository_commits_additions_nonnegative",
        sql`${table.additions} is null or ${table.additions} >= 0`,
      ),
      check(
        "repository_commits_deletions_nonnegative",
        sql`${table.deletions} is null or ${table.deletions} >= 0`,
      ),
      check(
        "repository_commits_changed_files_nonnegative",
        sql`${table.changedFiles} is null or ${table.changedFiles} >= 0`,
      ),
      index("repository_commits_project_repository_authored_at_idx").on(
        table.projectRepositoryId,
        table.authoredAt,
      ),
      index("repository_commits_project_repository_author_email_idx").on(
        table.projectRepositoryId,
        table.authorEmail,
      ),
    ],
  )
  .enableRLS();

export type RepositoryCommit = typeof repositoryCommits.$inferSelect;
export type NewRepositoryCommit = typeof repositoryCommits.$inferInsert;
