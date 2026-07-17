import {
  bigint,
  foreignKey,
  index,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { privateSchema } from "./github-repositories";
import { projectRepositories } from "./project-repositories";

// Package declarations extracted from repository manifests at an indexed commit.
export const repositoryDependencies = privateSchema
  .table(
    "repository_dependencies",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectRepositoryId: bigint("project_repository_id", {
        mode: "number",
      }).notNull(),
      ecosystem: text().notNull(),
      packageName: text("package_name").notNull(),
      versionConstraint: text("version_constraint"),
      dependencyKind: text("dependency_kind").notNull(),
      manifestPath: text("manifest_path").notNull(),
      indexedCommitSha: text("indexed_commit_sha").notNull(),
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
        name: "repository_dependencies_project_repository_id_fkey",
      }).onDelete("cascade"),
      unique("repository_dependencies_identity_unique").on(
        table.projectRepositoryId,
        table.ecosystem,
        table.manifestPath,
        table.packageName,
        table.dependencyKind,
      ),
      index("repository_dependencies_project_package_idx").on(
        table.projectRepositoryId,
        table.packageName,
      ),
      index("repository_dependencies_ecosystem_package_idx").on(
        table.ecosystem,
        table.packageName,
      ),
    ],
  )
  .enableRLS();

export type RepositoryDependency = typeof repositoryDependencies.$inferSelect;
export type NewRepositoryDependency = typeof repositoryDependencies.$inferInsert;
