import assert from "node:assert/strict";
import test from "node:test";

import {
  detectAgentsFromCommitMetadata,
  detectAgentsFromRepositoryPath,
  median,
  normalizeClaimedTechnology,
  summarizeAgentSignals,
  summarizeCodebaseSizes,
  summarizeTechnologyUsage,
  technologyFromDependency,
} from "../lib/insights/hackathon-analytics";

test("normalizes claimed technology aliases and ignores uncurated claims", () => {
  assert.deepEqual(normalizeClaimedTechnology("React.js"), {
    name: "React",
    category: "technology",
  });
  assert.deepEqual(normalizeClaimedTechnology("C++"), {
    name: "C++",
    category: "language",
  });
  assert.deepEqual(normalizeClaimedTechnology("C#"), {
    name: "C#",
    category: "language",
  });
  assert.equal(normalizeClaimedTechnology("A very specific internal tool"), null);
});

test("maps recognizable dependency packages without surfacing utility packages", () => {
  assert.deepEqual(technologyFromDependency("@anthropic-ai/sdk"), {
    name: "Anthropic",
    category: "technology",
  });
  assert.deepEqual(technologyFromDependency("FASTAPI"), {
    name: "FastAPI",
    category: "technology",
  });
  assert.equal(technologyFromDependency("left-pad"), null);
});

test("detects coding-agent signals from paths and explicit commit attribution", () => {
  assert.deepEqual(detectAgentsFromRepositoryPath("CLAUDE.md"), ["Claude Code"]);
  assert.deepEqual(detectAgentsFromRepositoryPath("docs/AGENTS.md"), ["Codex"]);
  assert.deepEqual(
    detectAgentsFromRepositoryPath(".github/copilot-instructions.md"),
    ["GitHub Copilot"],
  );
  assert.deepEqual(detectAgentsFromRepositoryPath(".cursor/rules/project.mdc"), ["Cursor"]);
  assert.deepEqual(
    detectAgentsFromCommitMetadata({
      message: "Implement analytics\n\nCo-authored-by: Codex <noreply@openai.com>",
      authorName: "Developer",
    }),
    ["Codex"],
  );
  assert.deepEqual(
    detectAgentsFromCommitMetadata({ message: "Continue improving the page" }),
    [],
  );
});

test("technology summaries count distinct projects and separate claimed-only usage", () => {
  const react = { name: "React", category: "technology" as const };
  const usage = summarizeTechnologyUsage({
    category: "technology",
    claimed: [
      { projectId: "one", technology: react },
      { projectId: "one", technology: react },
      { projectId: "two", technology: react },
    ],
    detected: [
      { projectId: "one", technology: react },
      { projectId: "three", technology: react },
    ],
    projectLookup: new Map([
      ["one", { name: "One", slug: "one" }],
      ["two", { name: "Two", slug: "two" }],
      ["three", { name: "Three", slug: "three" }],
    ]),
  });

  assert.deepEqual(usage, [{
    name: "React",
    category: "technology",
    codeDetectedProjects: 2,
    claimedOnlyProjects: 1,
    totalProjects: 3,
    projects: [
      { id: "one", name: "One", slug: "one", evidence: "detected" },
      { id: "three", name: "Three", slug: "three", evidence: "detected" },
      { id: "two", name: "Two", slug: "two", evidence: "claimed" },
    ],
  }]);
});

test("technology summaries drop unresolvable projects from lists but keep counts", () => {
  const python = { name: "Python", category: "language" as const };
  const usage = summarizeTechnologyUsage({
    category: "language",
    claimed: [],
    detected: [
      { projectId: "known", technology: python },
      { projectId: "unknown", technology: python },
    ],
    projectLookup: new Map([["known", { name: "Known", slug: "known" }]]),
  });

  assert.equal(usage[0].codeDetectedProjects, 2);
  assert.deepEqual(usage[0].projects, [
    { id: "known", name: "Known", slug: "known", evidence: "detected" },
  ]);
});

test("agent summaries deduplicate signals and use repository coverage as denominator", () => {
  assert.deepEqual(summarizeAgentSignals([
    { projectId: "one", agent: "Claude Code" },
    { projectId: "one", agent: "Claude Code" },
    { projectId: "two", agent: "Claude Code" },
    { projectId: "two", agent: "Cursor" },
  ], 4), [
    { agent: "Claude Code", projectCount: 2, percentage: 50 },
    { agent: "Cursor", projectCount: 1, percentage: 25 },
  ]);
});

test("codebase sizes combine repository and language rows per project", () => {
  const sizes = summarizeCodebaseSizes([
    { projectId: "one", projectName: "One", projectSlug: "one", sizeBytes: 200 },
    { projectId: "one", projectName: "One", projectSlug: "one", sizeBytes: 300 },
    { projectId: "two", projectName: "Two", projectSlug: "two", sizeBytes: 100 },
    { projectId: "empty", projectName: "Empty", projectSlug: "empty", sizeBytes: 0 },
  ]);

  assert.deepEqual(sizes, [
    { projectId: "one", projectName: "One", projectSlug: "one", sizeBytes: 500 },
    { projectId: "two", projectName: "Two", projectSlug: "two", sizeBytes: 100 },
  ]);
  assert.equal(median(sizes.map((project) => project.sizeBytes)), 300);
  assert.equal(median([]), 0);
});
