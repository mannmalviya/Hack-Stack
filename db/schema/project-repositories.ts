import {
  bigint,
  foreignKey,
  index,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { githubRepositories, privateSchema } from "./github-repositories";
import { projects } from "./projects";

// Associates a Devpost project with each GitHub repository URL it provides.
export const projectRepositories = privateSchema
  .table(
    "project_repositories",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      projectId: uuid("project_id").notNull(),
      repositoryId: bigint("repository_id", { mode: "number" }).notNull(),
      sourceUrl: text("source_url").notNull(),
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
        name: "project_repositories_project_id_fkey",
      }).onDelete("cascade"),
      foreignKey({
        columns: [table.repositoryId],
        foreignColumns: [githubRepositories.id],
        name: "project_repositories_repository_id_fkey",
      }).onDelete("cascade"),
      unique("project_repositories_project_repository_unique").on(
        table.projectId,
        table.repositoryId,
      ),
      index("project_repositories_repository_id_idx").on(table.repositoryId),
    ],
  )
  .enableRLS();

export type ProjectRepository = typeof projectRepositories.$inferSelect;
export type NewProjectRepository = typeof projectRepositories.$inferInsert;
