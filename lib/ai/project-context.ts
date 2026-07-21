import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  hackathons,
  projectRepositories,
  projects,
  repositoryCommits,
  repositoryDependencies,
  repositoryFiles,
} from "@/db/schema";
import { getProjectBySlug, type ProjectDetail } from "@/lib/data/projects";
import { getProjectEvidence, type ProjectEvidence } from "@/lib/data/project-evidence";
import { getGithubReadme } from "@/lib/github/readme-cache";
import { splitDevpostDescription } from "@/lib/devpost/description";

const README_CHAR_CAP = 20000;
const MAX_FILE_PATHS = 300;
const MAX_COMMITS = 100;

export const IGNORED_PATH_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)(dist|build|\.next|out|vendor|\.git)\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/,
];

/**
 * Everything the model may cite about one project, as labeled markdown.
 * Returns null when the project itself does not exist.
 */
export async function assembleProjectContext(
  hackathonSlug: string,
  projectSlug: string,
): Promise<string | null> {
  const project = await getProjectBySlug(hackathonSlug, projectSlug);
  if (!project) return null;

  const [readme, evidence, structure] = await Promise.all([
    buildReadmeSection(project.githubUrl),
    getProjectEvidence(hackathonSlug, projectSlug).then(buildEvidenceSection),
    buildStructureSection(hackathonSlug, projectSlug),
  ]);

  return [
    `# Project: ${project.name}`,
    buildDevpostSection(project),
    readme,
    evidence,
    structure,
  ].join("\n\n");
}

// ── 1. Devpost brief — projects.description ─────────────────────

export function buildDevpostSection(project: ProjectDetail): string {
  const header = "## Devpost submission (written by the team)";
  if (!project.description?.trim()) {
    return `${header}\n\nNo Devpost description available.`;
  }

  const sections = splitDevpostDescription(project.description, project.name);
  const body = sections
    .map((s) => `### ${s.heading ?? "Overview"}\n\n${s.body}`)
    .join("\n\n");

  return `${header}\n\n${body}`;
}

// ── 2. README — live from GitHub, keyed by projects.githubUrl ───

async function buildReadmeSection(githubUrl: string | null): Promise<string> {
  const header = "## README (from the GitHub repository)";
  const readme = await getGithubReadme(githubUrl);
  if (!readme?.content.trim()) return `${header}\n\nNo README available.`;

  const truncated =
    readme.content.length > README_CHAR_CAP
      ? readme.content.slice(0, README_CHAR_CAP) + "\n\n[README truncated]"
      : readme.content;

  return `${header}\n\n${truncated}`;
}

// ── 3. Evidence — getProjectEvidence (builtWithData + private.*) ─

export function buildEvidenceSection(evidence: ProjectEvidence | null): string {
  const header = "## Detected evidence (automated analysis)";
  if (!evidence) return `${header}\n\nNo evidence available.`;

  const lines: string[] = [];

  if (!evidence.hasIndexedRepository) {
    lines.push(
      "No repository was indexed for this project. Claimed technologies below could not be checked against code.",
    );
  } else {
    const { sizeBytes, fileCount } = evidence.codebase;
    lines.push(
      `Indexed codebase: ${fileCount} recognized source files, ${Math.round(sizeBytes / 1024)} KB.`,
    );
  }

  for (const tech of evidence.technologies) {
    lines.push(
      `- ${tech.name} (${tech.category}) — ${
        tech.evidence === "detected"
          ? "detected in the code"
          : "claimed on Devpost, not found in the code"
      }`,
    );
  }

  for (const signal of evidence.agents) {
    const sources = [
      signal.fromConfigFiles && "config files committed to the repository",
      signal.fromCommits && "commit authorship or trailers",
    ].filter(Boolean);
    lines.push(`- AI coding agent: ${signal.agent} — evidence: ${sources.join("; ")}`);
  }

  if (lines.length === 0) return `${header}\n\nNo evidence available.`;
  return `${header}\n\n${lines.join("\n")}`;
}

// ── 4. Codebase structure — private.repository_* tables ─────────

async function buildStructureSection(
  hackathonSlug: string,
  projectSlug: string,
): Promise<string> {
  const header = "## Codebase structure (from repository index)";

  // ProjectDetail carries no id, so resolve it the same way the other
  // slug-keyed loaders do.
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(
      and(
        eq(hackathons.devpostSlug, hackathonSlug),
        eq(projects.devpostSlug, projectSlug),
      ),
    )
    .limit(1);

  if (!project) return `${header}\n\nNo repository index available.`;

  const projectFilter = eq(projectRepositories.projectId, project.id);

  const [files, deps, commits] = await Promise.all([
    db
      .select({ path: repositoryFiles.path })
      .from(repositoryFiles)
      .innerJoin(
        projectRepositories,
        eq(repositoryFiles.projectRepositoryId, projectRepositories.id),
      )
      .where(and(projectFilter, eq(repositoryFiles.isBinary, false)))
      .orderBy(asc(repositoryFiles.path)),
    db
      .select({
        packageName: repositoryDependencies.packageName,
        versionConstraint: repositoryDependencies.versionConstraint,
        manifestPath: repositoryDependencies.manifestPath,
      })
      .from(repositoryDependencies)
      .innerJoin(
        projectRepositories,
        eq(repositoryDependencies.projectRepositoryId, projectRepositories.id),
      )
      .where(projectFilter)
      .orderBy(asc(repositoryDependencies.manifestPath), asc(repositoryDependencies.packageName)),
    db
      .select({ message: repositoryCommits.message })
      .from(repositoryCommits)
      .innerJoin(
        projectRepositories,
        eq(repositoryCommits.projectRepositoryId, projectRepositories.id),
      )
      .where(projectFilter)
      .orderBy(desc(repositoryCommits.authoredAt))
      .limit(MAX_COMMITS),
  ]);

  const parts: string[] = [header];

  // File tree, grouped by top-level directory.
  const cleanPaths = files
    .map((f) => f.path)
    .filter((p) => !IGNORED_PATH_PATTERNS.some((re) => re.test(p)))
    .slice(0, MAX_FILE_PATHS);

  if (cleanPaths.length === 0) {
    parts.push("### Files\n\nNo file index available.");
  } else {
    const byDir = new Map<string, string[]>();
    for (const p of cleanPaths) {
      const top = p.includes("/") ? p.split("/")[0] + "/" : "(root)";
      byDir.set(top, [...(byDir.get(top) ?? []), p]);
    }
    const tree = [...byDir.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dir, ps]) => `${dir}\n${ps.map((p) => `  ${p}`).join("\n")}`)
      .join("\n");
    parts.push(`### Files (${cleanPaths.length} shown)\n\n\`\`\`\n${tree}\n\`\`\``);
  }

  // Dependencies, grouped by manifest.
  if (deps.length === 0) {
    parts.push("### Dependencies\n\nNo dependency index available.");
  } else {
    const byManifest = new Map<string, string[]>();
    for (const d of deps) {
      const entry = `${d.packageName}${d.versionConstraint ? `@${d.versionConstraint}` : ""}`;
      byManifest.set(d.manifestPath, [...(byManifest.get(d.manifestPath) ?? []), entry]);
    }
    const depLines = [...byManifest.entries()]
      .map(([m, list]) => `- ${m}: ${list.join(", ")}`)
      .join("\n");
    parts.push(`### Dependencies\n\n${depLines}`);
  }

  // Recent commit subjects (first line of message — there is no subject column).
  if (commits.length === 0) {
    parts.push("### Recent commits\n\nNo commit history available.");
  } else {
    const commitLines = commits
      .map((c) => `- ${c.message.split("\n")[0].trim()}`)
      .join("\n");
    parts.push(`### Recent commits (newest first)\n\n${commitLines}`);
  }

  return parts.join("\n\n");
}
