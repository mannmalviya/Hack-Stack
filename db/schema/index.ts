import { relations } from "drizzle-orm";

import { hackathonRequests } from "./hackathon-requests";
import { hackathons } from "./hackathons";
import { githubRepositories } from "./github-repositories";
import { hackerContributorMetrics } from "./hacker-contributor-metrics";
import { hackerInsightRuns } from "./hacker-insight-runs";
import { hackerTeamMetrics } from "./hacker-team-metrics";
import { projectRepositories } from "./project-repositories";
import { projectEmbeddingSources } from "./project-embedding-sources";
import { projects } from "./projects";
import { repositoryCommits } from "./repository-commits";
import { repositoryCommitAuthors } from "./repository-commit-authors";
import { repositoryDependencies } from "./repository-dependencies";
import { repositoryFiles } from "./repository-files";
import { repositoryIngestionRuns } from "./repository-ingestion-runs";

// Re-export every table from one entry point for application queries and the
// schema object passed to the Drizzle client.
export { hackathonRequests } from "./hackathon-requests";
export { hackathons } from "./hackathons";
export { projects } from "./projects";
export { githubRepositories, privateSchema } from "./github-repositories";
export { hackerContributorMetrics } from "./hacker-contributor-metrics";
export { hackerInsightRuns } from "./hacker-insight-runs";
export { hackerTeamMetrics } from "./hacker-team-metrics";
export { projectRepositories } from "./project-repositories";
export { projectEmbeddingSources } from "./project-embedding-sources";
export { repositoryCommits } from "./repository-commits";
export { repositoryCommitAuthors } from "./repository-commit-authors";
export { repositoryDependencies } from "./repository-dependencies";
export { repositoryFiles } from "./repository-files";
export { repositoryIngestionRuns } from "./repository-ingestion-runs";

// An approved request may point to the hackathon that was created from it.
export const hackathonRequestsRelations = relations(
  hackathonRequests,
  ({ one }) => ({
    hackathon: one(hackathons, {
      fields: [hackathonRequests.approvedHackathonId],
      references: [hackathons.id],
    }),
  }),
);

// A hackathon can be referenced by approval requests and contain many projects.
export const hackathonsRelations = relations(hackathons, ({ many }) => ({
  hackathonRequests: many(hackathonRequests),
  hackerInsightRuns: many(hackerInsightRuns),
  projects: many(projects),
}));

// Every imported project belongs to exactly one hackathon.
export const projectsRelations = relations(projects, ({ many, one }) => ({
  hackathon: one(hackathons, {
    fields: [projects.hackathonId],
    references: [hackathons.id],
  }),
  repositories: many(projectRepositories),
  embeddingSource: one(projectEmbeddingSources, {
    fields: [projects.id],
    references: [projectEmbeddingSources.projectId],
  }),
  hackerTeamMetrics: many(hackerTeamMetrics),
}));

export const projectEmbeddingSourcesRelations = relations(
  projectEmbeddingSources,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectEmbeddingSources.projectId],
      references: [projects.id],
    }),
  }),
);

export const hackerInsightRunsRelations = relations(
  hackerInsightRuns,
  ({ many, one }) => ({
    hackathon: one(hackathons, {
      fields: [hackerInsightRuns.hackathonId],
      references: [hackathons.id],
    }),
    teamMetrics: many(hackerTeamMetrics),
  }),
);

export const hackerTeamMetricsRelations = relations(
  hackerTeamMetrics,
  ({ many, one }) => ({
    run: one(hackerInsightRuns, {
      fields: [hackerTeamMetrics.runId],
      references: [hackerInsightRuns.id],
    }),
    project: one(projects, {
      fields: [hackerTeamMetrics.projectId],
      references: [projects.id],
    }),
    contributors: many(hackerContributorMetrics),
  }),
);

export const hackerContributorMetricsRelations = relations(
  hackerContributorMetrics,
  ({ one }) => ({
    teamMetrics: one(hackerTeamMetrics, {
      fields: [
        hackerContributorMetrics.runId,
        hackerContributorMetrics.projectId,
      ],
      references: [hackerTeamMetrics.runId, hackerTeamMetrics.projectId],
    }),
  }),
);

export const githubRepositoriesRelations = relations(
  githubRepositories,
  ({ many }) => ({
    projects: many(projectRepositories),
  }),
);

export const projectRepositoriesRelations = relations(
  projectRepositories,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [projectRepositories.projectId],
      references: [projects.id],
    }),
    repository: one(githubRepositories, {
      fields: [projectRepositories.repositoryId],
      references: [githubRepositories.id],
    }),
    ingestionRuns: many(repositoryIngestionRuns),
    commits: many(repositoryCommits),
    dependencies: many(repositoryDependencies),
    files: many(repositoryFiles),
  }),
);

export const repositoryCommitsRelations = relations(
  repositoryCommits,
  ({ many, one }) => ({
    authors: many(repositoryCommitAuthors),
    projectRepository: one(projectRepositories, {
      fields: [repositoryCommits.projectRepositoryId],
      references: [projectRepositories.id],
    }),
  }),
);

export const repositoryCommitAuthorsRelations = relations(
  repositoryCommitAuthors,
  ({ one }) => ({
    commit: one(repositoryCommits, {
      fields: [repositoryCommitAuthors.repositoryCommitId],
      references: [repositoryCommits.id],
    }),
  }),
);

export const repositoryDependenciesRelations = relations(
  repositoryDependencies,
  ({ one }) => ({
    projectRepository: one(projectRepositories, {
      fields: [repositoryDependencies.projectRepositoryId],
      references: [projectRepositories.id],
    }),
  }),
);

export const repositoryFilesRelations = relations(
  repositoryFiles,
  ({ one }) => ({
    projectRepository: one(projectRepositories, {
      fields: [repositoryFiles.projectRepositoryId],
      references: [projectRepositories.id],
    }),
  }),
);

export const repositoryIngestionRunsRelations = relations(
  repositoryIngestionRuns,
  ({ one }) => ({
    projectRepository: one(projectRepositories, {
      fields: [repositoryIngestionRuns.projectRepositoryId],
      references: [projectRepositories.id],
    }),
  }),
);
