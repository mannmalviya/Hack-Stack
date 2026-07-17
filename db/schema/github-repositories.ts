import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgSchema,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const privateSchema = pgSchema("private");

// Canonical GitHub identity and mutable repository metadata. Project links and
// immutable commit snapshots live in separate tables.
export const githubRepositories = privateSchema
  .table(
    "github_repositories",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      githubRepositoryId: bigint("github_repository_id", { mode: "number" }).notNull(),
      githubNodeId: text("github_node_id").notNull(),
      ownerGithubId: bigint("owner_github_id", { mode: "number" }).notNull(),
      ownerLogin: text("owner_login").notNull(),
      ownerType: text("owner_type").notNull(),
      name: text().notNull(),
      fullName: text("full_name").notNull(),
      htmlUrl: text("html_url").notNull(),
      defaultBranch: text("default_branch").notNull(),
      visibility: text().notNull(),
      isFork: boolean("is_fork").notNull(),
      parentGithubRepositoryId: bigint("parent_github_repository_id", {
        mode: "number",
      }),
      archived: boolean().notNull(),
      disabled: boolean().notNull(),
      githubCreatedAt: timestamp("github_created_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      githubUpdatedAt: timestamp("github_updated_at", {
        withTimezone: true,
        mode: "string",
      }).notNull(),
      githubPushedAt: timestamp("github_pushed_at", {
        withTimezone: true,
        mode: "string",
      }),
      apiEtag: text("api_etag"),
      metadataFetchedAt: timestamp("metadata_fetched_at", {
        withTimezone: true,
        mode: "string",
      }).defaultNow().notNull(),
      createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      unique("github_repositories_github_repository_id_unique").on(
        table.githubRepositoryId,
      ),
      unique("github_repositories_github_node_id_unique").on(table.githubNodeId),
      index("github_repositories_full_name_idx").using(
        "btree",
        sql`lower(${table.fullName})`,
      ),
      check(
        "github_repositories_github_repository_id_positive",
        sql`${table.githubRepositoryId} > 0`,
      ),
      check(
        "github_repositories_owner_github_id_positive",
        sql`${table.ownerGithubId} > 0`,
      ),
      check(
        "github_repositories_visibility_check",
        sql`${table.visibility} in ('public', 'private', 'internal')`,
      ),
      check(
        "github_repositories_owner_type_check",
        sql`${table.ownerType} in ('User', 'Organization')`,
      ),
    ],
  )
  .enableRLS();

export type GithubRepository = typeof githubRepositories.$inferSelect;
export type NewGithubRepository = typeof githubRepositories.$inferInsert;
