import assert from "node:assert/strict";
import test from "node:test";

import {
  isSupportedDependencyManifest,
  parseDependencyManifest,
} from "../lib/github/manifests";
import { parseGithubRepositoryUrl } from "../lib/github/urls";
import {
  classifyRepositoryFile,
  shouldIndexRepositoryPath,
} from "../lib/github/files";

test("normalizes GitHub repository root URLs", () => {
  assert.deepEqual(parseGithubRepositoryUrl("https://www.github.com/acme/example.git/"), {
    owner: "acme",
    repo: "example",
    canonicalUrl: "https://github.com/acme/example",
  });
  assert.throws(() => parseGithubRepositoryUrl("https://github.com/acme/example/tree/main"));
  assert.throws(() => parseGithubRepositoryUrl("https://gitlab.com/acme/example"));
});

test("extracts npm dependency kinds", () => {
  assert.deepEqual(
    parseDependencyManifest("apps/web/package.json", JSON.stringify({
      dependencies: { react: "^19.0.0" },
      devDependencies: { typescript: "^5.0.0" },
      peerDependencies: { zod: "^4.0.0" },
    })),
    [
      { ecosystem: "npm", packageName: "react", versionConstraint: "^19.0.0", dependencyKind: "runtime" },
      { ecosystem: "npm", packageName: "typescript", versionConstraint: "^5.0.0", dependencyKind: "development" },
      { ecosystem: "npm", packageName: "zod", versionConstraint: "^4.0.0", dependencyKind: "peer" },
    ],
  );
});

test("extracts Python, Cargo, and Go dependencies", () => {
  assert.deepEqual(
    parseDependencyManifest("requirements.txt", "fastapi==0.115\nhttpx>=0.28 # client\n-r dev.txt\n"),
    [
      { ecosystem: "pypi", packageName: "fastapi", versionConstraint: "==0.115", dependencyKind: "runtime" },
      { ecosystem: "pypi", packageName: "httpx", versionConstraint: ">=0.28", dependencyKind: "runtime" },
    ],
  );
  assert.deepEqual(
    parseDependencyManifest("pyproject.toml", `
      [project]
      dependencies = ["openai>=1.0", "anthropic"]
      [project.optional-dependencies]
      dev = ["pytest>=8"]
    `),
    [
      { ecosystem: "pypi", packageName: "openai", versionConstraint: ">=1.0", dependencyKind: "runtime" },
      { ecosystem: "pypi", packageName: "anthropic", versionConstraint: null, dependencyKind: "runtime" },
      { ecosystem: "pypi", packageName: "pytest", versionConstraint: ">=8", dependencyKind: "optional:dev" },
    ],
  );
  assert.deepEqual(
    parseDependencyManifest("Cargo.toml", `
      [dependencies]
      serde = "1"
      [dev-dependencies]
      insta = { version = "1.40" }
    `),
    [
      { ecosystem: "cargo", packageName: "serde", versionConstraint: "1", dependencyKind: "runtime" },
      { ecosystem: "cargo", packageName: "insta", versionConstraint: "1.40", dependencyKind: "development" },
    ],
  );
  assert.deepEqual(
    parseDependencyManifest("go.mod", `
      module example.com/app
      require (
        github.com/google/uuid v1.6.0
        golang.org/x/sync v0.7.0 // indirect
      )
    `),
    [
      { ecosystem: "go", packageName: "github.com/google/uuid", versionConstraint: "v1.6.0", dependencyKind: "runtime" },
      { ecosystem: "go", packageName: "golang.org/x/sync", versionConstraint: "v0.7.0", dependencyKind: "indirect" },
    ],
  );
});

test("recognizes supported manifests regardless of directory casing", () => {
  assert.equal(isSupportedDependencyManifest("services/api/PYPROJECT.TOML"), true);
  assert.equal(isSupportedDependencyManifest("README.md"), false);
});

test("classifies source and binary files while excluding generated directories", () => {
  assert.deepEqual(classifyRepositoryFile("src/page.tsx"), {
    language: "TypeScript",
    isBinary: false,
  });
  assert.deepEqual(classifyRepositoryFile("public/cover.png"), {
    language: null,
    isBinary: true,
  });
  assert.equal(shouldIndexRepositoryPath("src/page.tsx"), true);
  assert.equal(shouldIndexRepositoryPath("node_modules/react/index.js"), false);
});
