import "server-only";

import { and, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  hackathons,
  projectRepositories,
  projects,
  repositoryCommits,
  repositoryDependencies,
  repositoryFiles,
} from "@/db/schema";
import {
  detectAgentsFromCommitMetadata,
  detectAgentsFromRepositoryPath,
  normalizeClaimedTechnology,
  normalizeDetectedLanguage,
  RECOGNIZED_DEPENDENCY_PACKAGES,
  technologyFromDependency,
  type AiCodeAgent,
  type TechnologyCategory,
  type TechnologyEvidenceKind,
} from "@/lib/insights/hackathon-analytics";

export type ProjectTechnology = {
  name: string;
  category: TechnologyCategory;
  evidence: TechnologyEvidenceKind;
};

export type ProjectAgentSignal = {
  agent: AiCodeAgent;
  /** Config files such as CLAUDE.md or .cursor/ committed to the repository. */
  fromConfigFiles: boolean;
  /** Commit authorship or trailers naming the agent. */
  fromCommits: boolean;
};

export type ProjectEvidence = {
  /**
   * False when no repository was indexed. Claims then have nothing to check
   * against, so they must not be presented as unsupported.
   */
  hasIndexedRepository: boolean;
  technologies: ProjectTechnology[];
  agents: ProjectAgentSignal[];
};

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * What a project claimed on Devpost against what its code actually shows.
 *
 * Detection mirrors the hackathon-wide insights exactly (same language, package
 * and agent heuristics) so a project reads the same here as in the aggregate.
 */
export async function getProjectEvidence(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ProjectEvidence | null> {
  const [project] = await db
    .select({ id: projects.id, builtWithData: projects.builtWithData })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(
      and(
        eq(hackathons.devpostSlug, hackathonSlug),
        eq(projects.devpostSlug, projectSlug),
      ),
    )
    .limit(1);

  if (!project) return null;

  const projectFilter = eq(projectRepositories.projectId, project.id);

  const [repositories, languageRows, dependencyRows, agentFileRows, agentCommitRows] =
    await Promise.all([
      db
        .select({ id: projectRepositories.id })
        .from(projectRepositories)
        .where(projectFilter)
        .limit(1),
      db
        .selectDistinct({ language: repositoryFiles.language })
        .from(repositoryFiles)
        .innerJoin(
          projectRepositories,
          eq(repositoryFiles.projectRepositoryId, projectRepositories.id),
        )
        .where(and(
          projectFilter,
          eq(repositoryFiles.isBinary, false),
          isNotNull(repositoryFiles.language),
        )),
      db
        .selectDistinct({ packageName: repositoryDependencies.packageName })
        .from(repositoryDependencies)
        .innerJoin(
          projectRepositories,
          eq(repositoryDependencies.projectRepositoryId, projectRepositories.id),
        )
        .where(and(
          projectFilter,
          inArray(
            sql<string>`lower(${repositoryDependencies.packageName})`,
            RECOGNIZED_DEPENDENCY_PACKAGES,
          ),
        )),
      db
        .selectDistinct({ path: repositoryFiles.path })
        .from(repositoryFiles)
        .innerJoin(
          projectRepositories,
          eq(repositoryFiles.projectRepositoryId, projectRepositories.id),
        )
        .where(and(
          projectFilter,
          or(
            ilike(repositoryFiles.path, "%claude.md"),
            ilike(repositoryFiles.path, "%agents.md"),
            ilike(repositoryFiles.path, "%copilot-instructions.md"),
            ilike(repositoryFiles.path, "%.github/instructions/%"),
            ilike(repositoryFiles.path, "%.claude/%"),
            ilike(repositoryFiles.path, "%.codex/%"),
            ilike(repositoryFiles.path, "%.cursor/%"),
            ilike(repositoryFiles.path, "%.cursorrules"),
            ilike(repositoryFiles.path, "%.windsurf/%"),
            ilike(repositoryFiles.path, "%.windsurfrules"),
            ilike(repositoryFiles.path, "%.cline/%"),
            ilike(repositoryFiles.path, "%.clinerules"),
            ilike(repositoryFiles.path, "%.aider%"),
            ilike(repositoryFiles.path, "%.continue/%"),
          ),
        )),
      db
        .selectDistinct({
          message: repositoryCommits.message,
          authorName: repositoryCommits.authorName,
          authorEmail: repositoryCommits.authorEmail,
        })
        .from(repositoryCommits)
        .innerJoin(
          projectRepositories,
          eq(repositoryCommits.projectRepositoryId, projectRepositories.id),
        )
        .where(and(
          projectFilter,
          or(
            ilike(repositoryCommits.message, "%co-authored-by:%"),
            ilike(repositoryCommits.message, "%generated with%"),
            ilike(repositoryCommits.message, "%generated by%"),
            ilike(repositoryCommits.authorName, "%claude%"),
            ilike(repositoryCommits.authorName, "%codex%"),
            ilike(repositoryCommits.authorName, "%copilot%"),
            ilike(repositoryCommits.authorEmail, "%anthropic.com%"),
            ilike(repositoryCommits.authorEmail, "%openai.com%"),
          ),
        )),
    ]);

  const detected = new Map<string, ProjectTechnology>();
  for (const row of languageRows) {
    const technology = row.language ? normalizeDetectedLanguage(row.language) : null;
    if (technology) detected.set(technology.name, { ...technology, evidence: "detected" });
  }
  for (const row of dependencyRows) {
    const technology = technologyFromDependency(row.packageName);
    if (technology) detected.set(technology.name, { ...technology, evidence: "detected" });
  }

  const technologies = new Map(detected);
  for (const claim of asStringArray(project.builtWithData)) {
    const technology = normalizeClaimedTechnology(claim);
    if (!technology || technologies.has(technology.name)) continue;
    technologies.set(technology.name, { ...technology, evidence: "claimed" });
  }

  const agents = new Map<AiCodeAgent, ProjectAgentSignal>();
  const record = (agent: AiCodeAgent, source: "fromConfigFiles" | "fromCommits") => {
    const existing = agents.get(agent)
      ?? { agent, fromConfigFiles: false, fromCommits: false };
    agents.set(agent, { ...existing, [source]: true });
  };
  for (const file of agentFileRows) {
    for (const agent of detectAgentsFromRepositoryPath(file.path)) record(agent, "fromConfigFiles");
  }
  for (const commit of agentCommitRows) {
    for (const agent of detectAgentsFromCommitMetadata(commit)) record(agent, "fromCommits");
  }

  return {
    hasIndexedRepository: repositories.length > 0,
    // Code-backed first: an unverified claim is the thing a judge needs to spot.
    technologies: [...technologies.values()].sort((left, right) =>
      (left.evidence === right.evidence ? 0 : left.evidence === "detected" ? -1 : 1)
      || left.name.localeCompare(right.name)),
    agents: [...agents.values()].sort((left, right) => left.agent.localeCompare(right.agent)),
  };
}
