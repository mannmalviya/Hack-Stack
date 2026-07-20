/**
 * Path-based architecture classification.
 *
 * The indexer stores file metadata only — no contents — so a layer can only be
 * inferred from where a file sits in the tree. These rules are conventions, not
 * facts about the code, and the UI labels them as inference for that reason.
 *
 * Pure and dependency-free so the rules can be exercised directly in tests.
 */

export type ArchitectureLayerId =
  | "interface"
  | "api"
  | "logic"
  | "jobs"
  | "data"
  | "config"
  | "tests"
  | "docs"
  | "assets";

export type ArchitectureLayerMeta = {
  id: ArchitectureLayerId;
  label: string;
  description: string;
  /** Runtime layers form the request-flow diagram; the rest sit beside it. */
  runtime: boolean;
};

/** Ordered top-down: what a request touches first appears first. */
export const ARCHITECTURE_LAYERS: ArchitectureLayerMeta[] = [
  {
    id: "interface",
    label: "Interface",
    description: "Screens, components and styles rendered to the user.",
    runtime: true,
  },
  {
    id: "api",
    label: "API & routing",
    description: "Request entry points: routes, handlers and controllers.",
    runtime: true,
  },
  {
    id: "logic",
    label: "Application logic",
    description: "Domain rules, services and shared utilities.",
    runtime: true,
  },
  {
    id: "jobs",
    label: "Background jobs",
    description: "Work run outside a request: tasks, workers and schedules.",
    runtime: true,
  },
  {
    id: "data",
    label: "Data & schema",
    description: "Schema definitions, migrations and data access.",
    runtime: true,
  },
  {
    id: "config",
    label: "Config & infra",
    description: "Build configuration, environment and deployment.",
    runtime: false,
  },
  {
    id: "tests",
    label: "Tests",
    description: "Automated test suites and fixtures.",
    runtime: false,
  },
  {
    id: "docs",
    label: "Docs",
    description: "Written documentation committed to the repository.",
    runtime: false,
  },
  {
    id: "assets",
    label: "Assets",
    description: "Static files served as-is: images, fonts and media.",
    runtime: false,
  },
];

const TEST_SEGMENTS = new Set([
  "__tests__", "cypress", "e2e", "fixtures", "playwright", "spec", "specs", "test", "tests",
]);
const DOC_SEGMENTS = new Set(["doc", "docs", "documentation"]);
const ASSET_SEGMENTS = new Set([
  "assets", "fonts", "img", "images", "media", "public", "static",
]);
const CONFIG_SEGMENTS = new Set([
  ".circleci", ".devcontainer", ".github", ".husky", ".vscode", "charts", "ci",
  "config", "deploy", "deployment", "docker", "infra", "infrastructure", "k8s",
  "kubernetes", "scripts", "terraform", "tools",
]);
const DATA_SEGMENTS = new Set([
  "dao", "database", "db", "drizzle", "entities", "migration", "migrations",
  "model", "models", "prisma", "repositories", "schema", "schemas", "seeds",
  "sql", "supabase",
]);
const JOB_SEGMENTS = new Set([
  "celery", "cron", "crons", "etl", "job", "jobs", "pipelines", "queue",
  "queues", "task", "tasks", "trigger", "worker", "workers",
]);
const API_SEGMENTS = new Set([
  "api", "controller", "controllers", "endpoint", "endpoints", "functions",
  "graphql", "handlers", "middleware", "resolvers", "route", "routes", "server",
]);
const INTERFACE_SEGMENTS = new Set([
  "app", "component", "components", "layouts", "pages", "partials", "screens",
  "styles", "templates", "ui", "views", "widgets",
]);
const LOGIC_SEGMENTS = new Set([
  "actions", "agents", "context", "core", "domain", "helpers", "hooks", "lib",
  "libs", "providers", "service", "services", "src", "store", "stores", "types",
  "util", "utils",
]);

/** Root-level files whose name alone identifies them as project configuration. */
const CONFIG_FILENAMES = new Set([
  "dockerfile", "docker-compose.yml", "docker-compose.yaml", "makefile",
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "requirements.txt", "pyproject.toml", "poetry.lock", "cargo.toml",
  "cargo.lock", "go.mod", "go.sum", "gemfile", "gemfile.lock", "procfile",
  "tsconfig.json", "jsconfig.json", "vercel.json", "netlify.toml",
]);

const DOC_EXTENSIONS = new Set(["md", "mdx", "rst", "txt", "adoc"]);
const ASSET_EXTENSIONS = new Set([
  "avif", "gif", "ico", "jpeg", "jpg", "mp3", "mp4", "otf", "png", "svg",
  "ttf", "wav", "webm", "webp", "woff", "woff2",
]);
const INTERFACE_EXTENSIONS = new Set([
  "astro", "css", "html", "jsx", "less", "sass", "scss", "svelte", "tsx", "vue",
]);
const CONFIG_EXTENSIONS = new Set(["cfg", "ini", "toml", "yaml", "yml"]);

function filename(path: string) {
  return (path.split("/").at(-1) ?? "").toLowerCase();
}

function extension(path: string) {
  const name = filename(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

function isConfigFilename(name: string) {
  return (
    CONFIG_FILENAMES.has(name)
    || name.startsWith(".")
    || name.startsWith("env.")
    || /\.config\.[a-z]+$/.test(name)
    || /^[a-z0-9.-]*rc(\.[a-z]+)?$/.test(name)
  );
}

/**
 * Assigns a file to exactly one layer.
 *
 * Checks run most-specific first, and match on *any* path segment, so a nested
 * override wins over its parent — `app/api/chat/route.ts` is API rather than
 * interface even though it lives under `app/`.
 */
export function classifyArchitectureLayer(
  path: string,
  isBinary = false,
): ArchitectureLayerId {
  const segments = path.toLowerCase().split("/");
  const directories = segments.slice(0, -1);
  const name = filename(path);
  const ext = extension(path);
  const has = (set: Set<string>) => directories.some((segment) => set.has(segment));

  if (has(TEST_SEGMENTS) || /\.(test|spec)\.[a-z]+$/.test(name)) return "tests";
  if (has(DOC_SEGMENTS) || DOC_EXTENSIONS.has(ext)) return "docs";
  if (has(ASSET_SEGMENTS) || ASSET_EXTENSIONS.has(ext) || isBinary) return "assets";
  if (has(CONFIG_SEGMENTS)) return "config";
  if (has(DATA_SEGMENTS) || ext === "sql") return "data";
  if (has(JOB_SEGMENTS)) return "jobs";
  if (has(API_SEGMENTS)) return "api";
  if (has(INTERFACE_SEGMENTS)) return "interface";
  if (has(LOGIC_SEGMENTS)) return "logic";

  // Nothing in the path said anything; fall back to the file itself. Config is
  // checked last here because a root dotfile is far more likely to be config
  // than source, but a nested `.eslintrc` would already have matched above.
  if (INTERFACE_EXTENSIONS.has(ext)) return "interface";
  if (isConfigFilename(name) || CONFIG_EXTENSIONS.has(ext)) return "config";
  return "logic";
}

/**
 * The directory a file is grouped under in the layer diagram. Capped at two
 * segments so deep route trees collapse into one readable module name.
 */
export function architectureModulePath(path: string) {
  const directories = path.split("/").slice(0, -1);
  if (directories.length === 0) return "/";
  return directories.slice(0, 2).join("/");
}
