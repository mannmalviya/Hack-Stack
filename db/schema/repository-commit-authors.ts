import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  primaryKey,
  smallint,
  text,
} from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { repositoryCommits } from "./repository-commits";

// GitHub's ordered author list for a commit: primary Git author first, then co-authors.
export const repositoryCommitAuthors = privateSchema
  .table(
    "repository_commit_authors",
    {
      repositoryCommitId: bigint("repository_commit_id", {
        mode: "number",
      }).notNull(),
      authorPosition: smallint("author_position").notNull(),
      isPrimary: boolean("is_primary").notNull(),
      authorName: text("author_name").notNull(),
      authorEmail: text("author_email"),
      authorGithubUserId: bigint("author_github_user_id", { mode: "number" }),
      authorGithubLogin: text("author_github_login"),
    },
    (table) => [
      primaryKey({
        columns: [table.repositoryCommitId, table.authorPosition],
        name: "repository_commit_authors_pkey",
      }),
      foreignKey({
        columns: [table.repositoryCommitId],
        foreignColumns: [repositoryCommits.id],
        name: "repository_commit_authors_repository_commit_id_fkey",
      }).onDelete("cascade"),
      check(
        "repository_commit_authors_position_check",
        sql`${table.authorPosition} >= 0
          and ${table.isPrimary} = (${table.authorPosition} = 0)`,
      ),
      check(
        "repository_commit_authors_github_identity_check",
        sql`(
          ${table.authorGithubUserId} is null and ${table.authorGithubLogin} is null
        ) or (
          ${table.authorGithubUserId} > 0
          and nullif(btrim(${table.authorGithubLogin}), '') is not null
        )`,
      ),
      index("repository_commit_authors_github_user_id_idx").on(
        table.authorGithubUserId,
      ),
    ],
  )
  .enableRLS();

export type RepositoryCommitAuthor = typeof repositoryCommitAuthors.$inferSelect;
export type NewRepositoryCommitAuthor = typeof repositoryCommitAuthors.$inferInsert;
