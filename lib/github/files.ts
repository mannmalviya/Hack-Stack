const EXCLUDED_DIRECTORIES = new Set([
  ".next",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "venv",
]);

const BINARY_EXTENSIONS = new Set([
  "7z", "avi", "bin", "bmp", "class", "dll", "dmg", "doc", "docx",
  "eot", "exe", "gif", "gz", "ico", "jar", "jpeg", "jpg", "mov",
  "mp3", "mp4", "pdf", "png", "ppt", "pptx", "pyc", "so", "tar",
  "tiff", "ttf", "wav", "webm", "webp", "woff", "woff2", "xls",
  "xlsx", "zip",
]);

const LANGUAGES: Record<string, string> = {
  c: "C",
  cc: "C++",
  cpp: "C++",
  cs: "C#",
  css: "CSS",
  dart: "Dart",
  ex: "Elixir",
  exs: "Elixir",
  go: "Go",
  h: "C",
  hpp: "C++",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  jsx: "JavaScript",
  kt: "Kotlin",
  kts: "Kotlin",
  lua: "Lua",
  md: "Markdown",
  php: "PHP",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  scala: "Scala",
  sh: "Shell",
  sol: "Solidity",
  sql: "SQL",
  svelte: "Svelte",
  swift: "Swift",
  tf: "HCL",
  ts: "TypeScript",
  tsx: "TypeScript",
  vue: "Vue",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
};

function extension(path: string) {
  const filename = path.split("/").at(-1) ?? "";
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

export function shouldIndexRepositoryPath(path: string) {
  return !path.split("/").some((segment) => EXCLUDED_DIRECTORIES.has(segment.toLowerCase()));
}

export function classifyRepositoryFile(path: string) {
  const fileExtension = extension(path);
  return {
    language: LANGUAGES[fileExtension] ?? null,
    isBinary: BINARY_EXTENSIONS.has(fileExtension),
  };
}
