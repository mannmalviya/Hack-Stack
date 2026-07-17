import { parse as parseToml } from "smol-toml";

export type ParsedDependency = {
  ecosystem: string;
  packageName: string;
  versionConstraint: string | null;
  dependencyKind: string;
};

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
]);

function basename(path: string) {
  return path.split("/").at(-1)?.toLowerCase() ?? "";
}

export function isSupportedDependencyManifest(path: string) {
  return MANIFEST_NAMES.has(basename(path));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function versionFromToml(value: unknown) {
  if (typeof value === "string") return value || null;
  const record = asRecord(value);
  return record && typeof record.version === "string" ? record.version || null : null;
}

function dependencyFromPythonSpecifier(
  value: string,
  dependencyKind: string,
): ParsedDependency | null {
  const withoutMarker = value.split(";", 1)[0].trim();
  const match = withoutMarker.match(/^([A-Za-z0-9_.-]+(?:\[[^\]]+\])?)\s*(.*)$/);
  if (!match) return null;
  return {
    ecosystem: "pypi",
    packageName: match[1],
    versionConstraint: match[2].trim() || null,
    dependencyKind,
  };
}

function parsePackageJson(content: string): ParsedDependency[] {
  const parsed = JSON.parse(content) as unknown;
  const root = asRecord(parsed);
  if (!root) throw new Error("package.json must contain an object");

  const sections = [
    ["dependencies", "runtime"],
    ["devDependencies", "development"],
    ["peerDependencies", "peer"],
    ["optionalDependencies", "optional"],
  ] as const;
  const dependencies: ParsedDependency[] = [];
  for (const [section, kind] of sections) {
    const values = asRecord(root[section]);
    if (!values) continue;
    for (const [packageName, version] of Object.entries(values)) {
      if (typeof version !== "string") continue;
      dependencies.push({
        ecosystem: "npm",
        packageName,
        versionConstraint: version || null,
        dependencyKind: kind,
      });
    }
  }
  return dependencies;
}

function parseRequirements(content: string): ParsedDependency[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => line.replace(/\s+#.*$/, "").trim())
    .map((line) => dependencyFromPythonSpecifier(line, "runtime"))
    .filter((dependency): dependency is ParsedDependency => Boolean(dependency));
}

function addTomlDependencies(
  target: ParsedDependency[],
  values: unknown,
  ecosystem: string,
  dependencyKind: string,
) {
  const dependencies = asRecord(values);
  if (!dependencies) return;
  for (const [packageName, value] of Object.entries(dependencies)) {
    if (ecosystem === "pypi" && packageName.toLowerCase() === "python") continue;
    target.push({
      ecosystem,
      packageName,
      versionConstraint: versionFromToml(value),
      dependencyKind,
    });
  }
}

function parsePyproject(content: string): ParsedDependency[] {
  const root = asRecord(parseToml(content));
  if (!root) throw new Error("pyproject.toml must contain a TOML object");
  const dependencies: ParsedDependency[] = [];
  const project = asRecord(root.project);

  if (Array.isArray(project?.dependencies)) {
    for (const value of project.dependencies) {
      if (typeof value !== "string") continue;
      const dependency = dependencyFromPythonSpecifier(value, "runtime");
      if (dependency) dependencies.push(dependency);
    }
  }

  const optional = asRecord(project?.["optional-dependencies"]);
  if (optional) {
    for (const [group, values] of Object.entries(optional)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        if (typeof value !== "string") continue;
        const dependency = dependencyFromPythonSpecifier(value, `optional:${group}`);
        if (dependency) dependencies.push(dependency);
      }
    }
  }

  const poetry = asRecord(asRecord(root.tool)?.poetry);
  addTomlDependencies(dependencies, poetry?.dependencies, "pypi", "runtime");
  addTomlDependencies(
    dependencies,
    poetry?.["dev-dependencies"],
    "pypi",
    "development",
  );
  const poetryGroups = asRecord(poetry?.group);
  if (poetryGroups) {
    for (const [group, value] of Object.entries(poetryGroups)) {
      addTomlDependencies(
        dependencies,
        asRecord(value)?.dependencies,
        "pypi",
        group === "dev" ? "development" : `group:${group}`,
      );
    }
  }
  return dependencies;
}

function parseCargoToml(content: string): ParsedDependency[] {
  const root = asRecord(parseToml(content));
  if (!root) throw new Error("Cargo.toml must contain a TOML object");
  const dependencies: ParsedDependency[] = [];
  addTomlDependencies(dependencies, root.dependencies, "cargo", "runtime");
  addTomlDependencies(
    dependencies,
    root["dev-dependencies"],
    "cargo",
    "development",
  );
  addTomlDependencies(
    dependencies,
    root["build-dependencies"],
    "cargo",
    "build",
  );
  return dependencies;
}

function parseGoMod(content: string): ParsedDependency[] {
  const dependencies: ParsedDependency[] = [];
  let inRequireBlock = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "require (") {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && line === ")") {
      inRequireBlock = false;
      continue;
    }
    const declaration = inRequireBlock
      ? line
      : line.startsWith("require ") ? line.slice("require ".length).trim() : null;
    if (!declaration || declaration.startsWith("//")) continue;
    const [packageName, version] = declaration.split(/\s+/, 3);
    if (!packageName || !version) continue;
    dependencies.push({
      ecosystem: "go",
      packageName,
      versionConstraint: version,
      dependencyKind: declaration.includes("// indirect") ? "indirect" : "runtime",
    });
  }
  return dependencies;
}

export function parseDependencyManifest(path: string, content: string) {
  switch (basename(path)) {
    case "package.json":
      return parsePackageJson(content);
    case "requirements.txt":
      return parseRequirements(content);
    case "pyproject.toml":
      return parsePyproject(content);
    case "cargo.toml":
      return parseCargoToml(content);
    case "go.mod":
      return parseGoMod(content);
    default:
      return [];
  }
}
