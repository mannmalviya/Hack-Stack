import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  githubRepositories,
  hackathons,
  projectRepositories,
  projects,
  repositoryDependencies,
  repositoryFiles,
} from "@/db/schema";
import {
  ARCHITECTURE_LAYERS,
  architectureModulePath,
  classifyArchitectureLayer,
  type ArchitectureLayerId,
} from "@/lib/architecture/layers";

/**
 * Upper bound on files read into the panel. Hackathon repositories are far
 * smaller than this; the cap exists so one pathological repository cannot
 * balloon the page payload, and the UI says when it bites.
 */
const FILE_LIMIT = 4000;

/** Modules listed per layer before the rest collapse into a "+N more" count. */
const MODULES_PER_LAYER = 6;

export type ArchitectureFile = {
  path: string;
  language: string | null;
  sizeBytes: number;
};

export type ArchitectureModule = {
  path: string;
  fileCount: number;
  primaryLanguage: string | null;
};

export type ArchitectureLayer = {
  id: ArchitectureLayerId;
  label: string;
  description: string;
  runtime: boolean;
  fileCount: number;
  /** Share of all classified files, 0–100. Drives the band's weight bar. */
  share: number;
  modules: ArchitectureModule[];
  hiddenModuleCount: number;
};

export type ArchitectureLanguage = {
  name: string;
  fileCount: number;
  bytes: number;
  share: number;
};

export type ArchitectureManifest = {
  path: string;
  ecosystem: string;
  runtime: string[];
  development: string[];
  totalCount: number;
};

export type ProjectArchitecture = {
  repository: {
    fullName: string;
    htmlUrl: string;
    defaultBranch: string;
    /** Commit the file list was indexed at; every deep link is pinned to it. */
    commitSha: string | null;
  };
  fileCount: number;
  totalBytes: number;
  /** True when the repository has more files than FILE_LIMIT. */
  truncated: boolean;
  layers: ArchitectureLayer[];
  languages: ArchitectureLanguage[];
  manifests: ArchitectureManifest[];
  /** Flat list for the file browser; the tree is assembled in the client. */
  files: ArchitectureFile[];
};

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** Groups a layer's files into modules, largest first. */
function buildModules(files: ArchitectureFile[]): {
  modules: ArchitectureModule[];
  hiddenModuleCount: number;
} {
  const grouped = new Map<string, { fileCount: number; languages: Map<string, number> }>();
  for (const file of files) {
    const key = architectureModulePath(file.path);
    const entry = grouped.get(key) ?? { fileCount: 0, languages: new Map() };
    entry.fileCount += 1;
    if (file.language) {
      entry.languages.set(file.language, (entry.languages.get(file.language) ?? 0) + 1);
    }
    grouped.set(key, entry);
  }

  const ranked = [...grouped.entries()]
    .map(([path, entry]) => ({
      path,
      fileCount: entry.fileCount,
      primaryLanguage:
        [...entry.languages.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
    }))
    .sort((left, right) => right.fileCount - left.fileCount || left.path.localeCompare(right.path));

  return {
    modules: ranked.slice(0, MODULES_PER_LAYER),
    hiddenModuleCount: Math.max(0, ranked.length - MODULES_PER_LAYER),
  };
}

function buildLayers(files: ArchitectureFile[], isBinary: Map<string, boolean>) {
  const byLayer = new Map<ArchitectureLayerId, ArchitectureFile[]>();
  for (const file of files) {
    const layer = classifyArchitectureLayer(file.path, isBinary.get(file.path) ?? false);
    const bucket = byLayer.get(layer);
    if (bucket) bucket.push(file);
    else byLayer.set(layer, [file]);
  }

  // Layer order is fixed by ARCHITECTURE_LAYERS rather than by size: the
  // diagram reads as a stack, so an empty layer is dropped, never reordered.
  return ARCHITECTURE_LAYERS.flatMap((meta): ArchitectureLayer[] => {
    const layerFiles = byLayer.get(meta.id);
    if (!layerFiles || layerFiles.length === 0) return [];
    const { modules, hiddenModuleCount } = buildModules(layerFiles);
    return [{
      ...meta,
      fileCount: layerFiles.length,
      share: percent(layerFiles.length, files.length),
      modules,
      hiddenModuleCount,
    }];
  });
}

function buildLanguages(files: ArchitectureFile[]): ArchitectureLanguage[] {
  const grouped = new Map<string, { fileCount: number; bytes: number }>();
  for (const file of files) {
    if (!file.language) continue;
    const entry = grouped.get(file.language) ?? { fileCount: 0, bytes: 0 };
    entry.fileCount += 1;
    entry.bytes += file.sizeBytes;
    grouped.set(file.language, entry);
  }

  const totalBytes = [...grouped.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  return [...grouped.entries()]
    .map(([name, entry]) => ({ name, ...entry, share: percent(entry.bytes, totalBytes) }))
    .sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name));
}

function buildManifests(
  rows: Array<{ ecosystem: string; packageName: string; dependencyKind: string; manifestPath: string }>,
): ArchitectureManifest[] {
  const grouped = new Map<string, ArchitectureManifest>();
  for (const row of rows) {
    const manifest = grouped.get(row.manifestPath) ?? {
      path: row.manifestPath,
      ecosystem: row.ecosystem,
      runtime: [],
      development: [],
      totalCount: 0,
    };
    // Anything not explicitly a runtime dependency (dev, peer, optional,
    // indirect) is secondary for a judge skimming the stack.
    if (row.dependencyKind === "runtime") manifest.runtime.push(row.packageName);
    else manifest.development.push(row.packageName);
    manifest.totalCount += 1;
    grouped.set(row.manifestPath, manifest);
  }

  return [...grouped.values()]
    .map((manifest) => ({
      ...manifest,
      runtime: manifest.runtime.sort((a, b) => a.localeCompare(b)),
      development: manifest.development.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((left, right) => right.totalCount - left.totalCount || left.path.localeCompare(right.path));
}

/**
 * How a project's indexed repository is put together.
 *
 * Returns null when the project has no indexed repository — the caller must
 * distinguish "nothing found" from "never looked", so this never fabricates an
 * empty architecture.
 */
export async function getProjectArchitecture(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ProjectArchitecture | null> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(
      eq(hackathons.devpostSlug, hackathonSlug),
      eq(projects.devpostSlug, projectSlug),
    ))
    .limit(1);

  if (!project) return null;

  const [repository] = await db
    .select({
      projectRepositoryId: projectRepositories.id,
      fullName: githubRepositories.fullName,
      htmlUrl: githubRepositories.htmlUrl,
      defaultBranch: githubRepositories.defaultBranch,
    })
    .from(projectRepositories)
    .innerJoin(githubRepositories, eq(projectRepositories.repositoryId, githubRepositories.id))
    .where(eq(projectRepositories.projectId, project.id))
    .limit(1);

  if (!repository) return null;

  const repositoryFilter = eq(
    repositoryFiles.projectRepositoryId,
    repository.projectRepositoryId,
  );

  const [fileRows, dependencyRows] = await Promise.all([
    db
      .select({
        path: repositoryFiles.path,
        language: repositoryFiles.language,
        sizeBytes: repositoryFiles.sizeBytes,
        isBinary: repositoryFiles.isBinary,
        indexedCommitSha: repositoryFiles.indexedCommitSha,
      })
      .from(repositoryFiles)
      .where(repositoryFilter)
      .orderBy(asc(repositoryFiles.path))
      // One over the cap so the truncation flag is exact rather than a guess.
      .limit(FILE_LIMIT + 1),
    db
      .select({
        ecosystem: repositoryDependencies.ecosystem,
        packageName: repositoryDependencies.packageName,
        dependencyKind: repositoryDependencies.dependencyKind,
        manifestPath: repositoryDependencies.manifestPath,
      })
      .from(repositoryDependencies)
      .where(eq(
        repositoryDependencies.projectRepositoryId,
        repository.projectRepositoryId,
      )),
  ]);

  if (fileRows.length === 0) return null;

  const truncated = fileRows.length > FILE_LIMIT;
  const kept = truncated ? fileRows.slice(0, FILE_LIMIT) : fileRows;
  const files: ArchitectureFile[] = kept.map((row) => ({
    path: row.path,
    language: row.language,
    sizeBytes: row.sizeBytes,
  }));
  const isBinary = new Map(kept.map((row) => [row.path, row.isBinary]));

  return {
    repository: {
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      defaultBranch: repository.defaultBranch,
      commitSha: kept[0]?.indexedCommitSha ?? null,
    },
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
    truncated,
    layers: buildLayers(files, isBinary),
    languages: buildLanguages(files),
    manifests: buildManifests(dependencyRows),
    files,
  };
}
