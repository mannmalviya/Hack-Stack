import assert from "node:assert/strict";
import test from "node:test";

import {
  architectureModulePath,
  classifyArchitectureLayer,
} from "../lib/architecture/layers";

test("a nested override beats the directory it sits under", () => {
  // `app/` alone reads as interface, but the api segment is more specific.
  assert.equal(classifyArchitectureLayer("app/page.tsx"), "interface");
  assert.equal(classifyArchitectureLayer("app/api/chat/route.ts"), "api");
  assert.equal(classifyArchitectureLayer("src/lib/db/schema.ts"), "data");
  assert.equal(classifyArchitectureLayer("src/components/Button.tsx"), "interface");
});

test("classifies each layer from conventional directory names", () => {
  const cases: Array<[string, string]> = [
    ["components/projects/card.tsx", "interface"],
    ["backend/controllers/users.py", "api"],
    ["lib/insights/analytics.ts", "logic"],
    ["trigger/index-project.ts", "jobs"],
    ["supabase/migrations/0001_init.sql", "data"],
    [".github/workflows/deploy.yml", "config"],
    ["tests/github-readme.test.ts", "tests"],
    ["docs/architecture.md", "docs"],
    ["public/logo.svg", "assets"],
  ];
  for (const [path, expected] of cases) {
    assert.equal(classifyArchitectureLayer(path), expected, path);
  }
});

test("falls back to the file itself when the path says nothing", () => {
  assert.equal(classifyArchitectureLayer("main.py"), "logic");
  assert.equal(classifyArchitectureLayer("index.html"), "interface");
  assert.equal(classifyArchitectureLayer("README.md"), "docs");
  assert.equal(classifyArchitectureLayer("package.json"), "config");
  assert.equal(classifyArchitectureLayer(".eslintrc.json"), "config");
  assert.equal(classifyArchitectureLayer("next.config.ts"), "config");
});

test("a binary file is an asset wherever it sits", () => {
  assert.equal(classifyArchitectureLayer("lib/model.bin", true), "assets");
  // Extension alone is enough when the indexer did not flag it.
  assert.equal(classifyArchitectureLayer("lib/demo.mp4"), "assets");
});

test("a test file is a test even outside a test directory", () => {
  assert.equal(classifyArchitectureLayer("lib/data/projects.test.ts"), "tests");
  assert.equal(classifyArchitectureLayer("app/api/route.spec.ts"), "tests");
});

test("modules collapse to two segments so deep routes stay readable", () => {
  assert.equal(architectureModulePath("app/(workspace)/hackathons/[slug]/page.tsx"), "app/(workspace)");
  assert.equal(architectureModulePath("lib/data/projects.ts"), "lib/data");
  assert.equal(architectureModulePath("trigger/index.ts"), "trigger");
  assert.equal(architectureModulePath("README.md"), "/");
});
