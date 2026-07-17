export type TechnologyCategory = "language" | "technology";

export type TechnologyMatch = {
  name: string;
  category: TechnologyCategory;
};

export type TechnologyUsage = TechnologyMatch & {
  codeDetectedProjects: number;
  claimedOnlyProjects: number;
  totalProjects: number;
};

export const AI_CODE_AGENTS = [
  "Claude Code",
  "Codex",
  "GitHub Copilot",
  "Cursor",
  "Windsurf",
  "Cline",
  "Aider",
  "Continue",
] as const;

export type AiCodeAgent = (typeof AI_CODE_AGENTS)[number];

export type AgentSignalUsage = {
  agent: AiCodeAgent;
  projectCount: number;
  percentage: number;
};

export type ProjectCodebaseSize = {
  projectId: string;
  projectName: string;
  projectSlug: string;
  sizeBytes: number;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  c: "C",
  cplusplus: "C++",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  dart: "Dart",
  go: "Go",
  golang: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  kotlin: "Kotlin",
  php: "PHP",
  python: "Python",
  python3: "Python",
  ruby: "Ruby",
  rust: "Rust",
  solidity: "Solidity",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  ts: "TypeScript",
};

const TECHNOLOGY_ALIASES: Record<string, string> = {
  angular: "Angular",
  anthropic: "Anthropic",
  aws: "AWS",
  amazonwebservices: "AWS",
  cohere: "Cohere",
  crewai: "CrewAI",
  django: "Django",
  docker: "Docker",
  express: "Express",
  expressjs: "Express",
  fastapi: "FastAPI",
  firebase: "Firebase",
  flask: "Flask",
  gemini: "Google Gemini",
  googlegemini: "Google Gemini",
  huggingface: "Hugging Face",
  langchain: "LangChain",
  llamaindex: "LlamaIndex",
  mongodb: "MongoDB",
  mistral: "Mistral AI",
  mistralai: "Mistral AI",
  next: "Next.js",
  nextjs: "Next.js",
  node: "Node.js",
  nodejs: "Node.js",
  openai: "OpenAI",
  ollama: "Ollama",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  pytorch: "PyTorch",
  react: "React",
  reactjs: "React",
  redis: "Redis",
  streamlit: "Streamlit",
  supabase: "Supabase",
  svelte: "Svelte",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  tensorflow: "TensorFlow",
  vercel: "Vercel",
  vercelai: "Vercel AI SDK",
  vercelaisdk: "Vercel AI SDK",
  vue: "Vue",
  vuejs: "Vue",
};

const DEPENDENCY_TECHNOLOGIES: Record<string, string> = {
  "@angular/core": "Angular",
  "@anthropic-ai/sdk": "Anthropic",
  "@ai-sdk/anthropic": "Anthropic",
  "@ai-sdk/google": "Google Gemini",
  "@ai-sdk/openai": "OpenAI",
  "@google/generative-ai": "Google Gemini",
  "@langchain/core": "LangChain",
  "@langchain/openai": "LangChain",
  "@supabase/supabase-js": "Supabase",
  "@supabase/ssr": "Supabase",
  "@vercel/ai": "Vercel AI SDK",
  ai: "Vercel AI SDK",
  angular: "Angular",
  anthropic: "Anthropic",
  cohere: "Cohere",
  crewai: "CrewAI",
  django: "Django",
  express: "Express",
  fastapi: "FastAPI",
  firebase: "Firebase",
  flask: "Flask",
  langchain: "LangChain",
  llama_index: "LlamaIndex",
  "llama-index": "LlamaIndex",
  llamaindex: "LlamaIndex",
  mongodb: "MongoDB",
  mongoose: "MongoDB",
  mistralai: "Mistral AI",
  next: "Next.js",
  openai: "OpenAI",
  ollama: "Ollama",
  pg: "PostgreSQL",
  psycopg: "PostgreSQL",
  psycopg2: "PostgreSQL",
  redis: "Redis",
  react: "React",
  streamlit: "Streamlit",
  "semantic-kernel": "Semantic Kernel",
  supabase: "Supabase",
  svelte: "Svelte",
  tailwindcss: "Tailwind CSS",
  tensorflow: "TensorFlow",
  torch: "PyTorch",
  transformers: "Hugging Face",
  vercel: "Vercel",
  vue: "Vue",
};

export const RECOGNIZED_DEPENDENCY_PACKAGES = Object.keys(DEPENDENCY_TECHNOLOGIES);

function aliasKey(value: string) {
  return value
    .toLowerCase()
    .replaceAll("+", "plus")
    .replaceAll("#", "sharp")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeClaimedTechnology(value: string): TechnologyMatch | null {
  const key = aliasKey(value.trim());
  if (!key) return null;
  const language = LANGUAGE_ALIASES[key];
  if (language) return { name: language, category: "language" };
  const technology = TECHNOLOGY_ALIASES[key];
  return technology ? { name: technology, category: "technology" } : null;
}

export function normalizeDetectedLanguage(value: string): TechnologyMatch | null {
  const language = LANGUAGE_ALIASES[aliasKey(value)];
  return language ? { name: language, category: "language" } : null;
}

export function technologyFromDependency(packageName: string): TechnologyMatch | null {
  const technology = DEPENDENCY_TECHNOLOGIES[packageName.trim().toLowerCase()];
  return technology ? { name: technology, category: "technology" } : null;
}

function includesPathSegment(path: string, segment: string) {
  return path === segment || path.startsWith(`${segment}/`) || path.includes(`/${segment}/`);
}

export function detectAgentsFromRepositoryPath(path: string): AiCodeAgent[] {
  const normalized = path.trim().toLowerCase().replaceAll("\\", "/");
  const basename = normalized.split("/").at(-1) ?? "";
  const agents = new Set<AiCodeAgent>();

  if (basename === "claude.md" || includesPathSegment(normalized, ".claude")) agents.add("Claude Code");
  if (basename === "agents.md" || includesPathSegment(normalized, ".codex")) agents.add("Codex");
  if (
    normalized === ".github/copilot-instructions.md"
    || normalized.startsWith(".github/instructions/")
    || normalized.includes("/.github/instructions/")
  ) agents.add("GitHub Copilot");
  if (basename === ".cursorrules" || includesPathSegment(normalized, ".cursor")) agents.add("Cursor");
  if (basename === ".windsurfrules" || includesPathSegment(normalized, ".windsurf")) agents.add("Windsurf");
  if (basename === ".clinerules" || includesPathSegment(normalized, ".cline")) agents.add("Cline");
  if (basename.startsWith(".aider") || includesPathSegment(normalized, ".aider")) agents.add("Aider");
  if (includesPathSegment(normalized, ".continue")) agents.add("Continue");

  return [...agents];
}

export function detectAgentsFromCommitMetadata(input: {
  message: string;
  authorName?: string | null;
  authorEmail?: string | null;
}): AiCodeAgent[] {
  const text = `${input.authorName ?? ""}\n${input.authorEmail ?? ""}\n${input.message}`.toLowerCase();
  const agents = new Set<AiCodeAgent>();

  if (/claude code|co-authored-by:\s*claude|@anthropic\.com/.test(text)) agents.add("Claude Code");
  if (/co-authored-by:\s*codex|generated (with|by) codex|codex <noreply@openai\.com>/.test(text)) agents.add("Codex");
  if (/co-authored-by:\s*(github )?copilot|generated (with|by) (github )?copilot/.test(text)) agents.add("GitHub Copilot");
  if (/generated (with|by) cursor|co-authored-by:\s*cursor/.test(text)) agents.add("Cursor");
  if (/generated (with|by) windsurf|co-authored-by:\s*windsurf/.test(text)) agents.add("Windsurf");
  if (/generated (with|by) cline|co-authored-by:\s*cline/.test(text)) agents.add("Cline");
  if (/generated (with|by) aider|co-authored-by:\s*aider/.test(text)) agents.add("Aider");
  if (/generated (with|by) continue|co-authored-by:\s*continue/.test(text)) agents.add("Continue");

  return [...agents];
}

type TechnologyEvidence = {
  projectId: string;
  technology: TechnologyMatch;
};

export function summarizeTechnologyUsage(input: {
  claimed: TechnologyEvidence[];
  detected: TechnologyEvidence[];
  category: TechnologyCategory;
  limit?: number;
}): TechnologyUsage[] {
  const claimedByTechnology = new Map<string, Set<string>>();
  const detectedByTechnology = new Map<string, Set<string>>();

  for (const evidence of input.claimed) {
    if (evidence.technology.category !== input.category) continue;
    const projects = claimedByTechnology.get(evidence.technology.name) ?? new Set<string>();
    projects.add(evidence.projectId);
    claimedByTechnology.set(evidence.technology.name, projects);
  }
  for (const evidence of input.detected) {
    if (evidence.technology.category !== input.category) continue;
    const projects = detectedByTechnology.get(evidence.technology.name) ?? new Set<string>();
    projects.add(evidence.projectId);
    detectedByTechnology.set(evidence.technology.name, projects);
  }

  const names = new Set([...claimedByTechnology.keys(), ...detectedByTechnology.keys()]);
  return [...names]
    .map((name) => {
      const claimed = claimedByTechnology.get(name) ?? new Set<string>();
      const detected = detectedByTechnology.get(name) ?? new Set<string>();
      const claimedOnlyProjects = [...claimed].filter((projectId) => !detected.has(projectId)).length;
      return {
        name,
        category: input.category,
        codeDetectedProjects: detected.size,
        claimedOnlyProjects,
        totalProjects: new Set([...claimed, ...detected]).size,
      };
    })
    .sort((left, right) => right.totalProjects - left.totalProjects || left.name.localeCompare(right.name))
    .slice(0, input.limit ?? 10);
}

export function summarizeAgentSignals(
  signals: Array<{ projectId: string; agent: AiCodeAgent }>,
  usableProjectCount: number,
): AgentSignalUsage[] {
  const projectsByAgent = new Map<AiCodeAgent, Set<string>>();
  for (const signal of signals) {
    const projects = projectsByAgent.get(signal.agent) ?? new Set<string>();
    projects.add(signal.projectId);
    projectsByAgent.set(signal.agent, projects);
  }

  return AI_CODE_AGENTS
    .map((agent) => {
      const projectCount = projectsByAgent.get(agent)?.size ?? 0;
      return {
        agent,
        projectCount,
        percentage: usableProjectCount > 0
          ? Math.round((projectCount / usableProjectCount) * 100)
          : 0,
      };
    })
    .filter((usage) => usage.projectCount > 0)
    .sort((left, right) => right.projectCount - left.projectCount || left.agent.localeCompare(right.agent));
}

export function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function summarizeCodebaseSizes(rows: Array<{
  projectId: string;
  projectName: string;
  projectSlug: string;
  sizeBytes: number;
}>): ProjectCodebaseSize[] {
  const sizesByProject = new Map<string, ProjectCodebaseSize>();
  for (const row of rows) {
    const current = sizesByProject.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      projectSlug: row.projectSlug,
      sizeBytes: 0,
    };
    current.sizeBytes += Number(row.sizeBytes);
    sizesByProject.set(row.projectId, current);
  }

  return [...sizesByProject.values()]
    .filter((project) => project.sizeBytes > 0)
    .sort((left, right) => right.sizeBytes - left.sizeBytes || left.projectName.localeCompare(right.projectName));
}
