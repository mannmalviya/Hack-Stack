import assert from "node:assert/strict";
import test from "node:test";

import { buildVerificationPrompt } from "../lib/verification/prompt";

const baseInputs = {
  name: "WidgetForge",
  tagline: "Build widgets fast",
  description: "A tool for forging widgets",
  builtWith: ["typescript", "next.js"],
  inspiration: "We hated slow widgets",
  whatItDoes: "Forges widgets",
  readme: "# WidgetForge\nRun npm install",
};

test("includes every claim section and the built-with list", () => {
  const prompt = buildVerificationPrompt(baseInputs);
  assert.match(prompt, /--- PROJECT NAME ---\nWidgetForge/);
  assert.match(prompt, /--- BUILT WITH ---\ntypescript, next\.js/);
  assert.match(prompt, /--- README ---\n# WidgetForge/);
  assert.match(prompt, /--- WHAT IT DOES ---\nForges widgets/);
});

test("states the four verification outcomes and the JSON-only contract", () => {
  const prompt = buildVerificationPrompt(baseInputs);
  for (const outcome of ["verified", "code_supported", "claimed_only", "blocked"]) {
    assert.ok(prompt.includes(`'${outcome}'`), `missing outcome ${outcome}`);
  }
  assert.match(prompt, /Output ONLY a single JSON object/);
});

test("renders placeholders for missing fields instead of null", () => {
  const prompt = buildVerificationPrompt({
    name: "Bare",
    tagline: null,
    description: null,
    builtWith: [],
    inspiration: null,
    whatItDoes: null,
    readme: null,
  });
  assert.match(prompt, /--- README ---\n\(none provided\)/);
  assert.match(prompt, /--- BUILT WITH ---\n\(none provided\)/);
  assert.match(prompt, /--- TAGLINE ---\n\(none provided\)/);
});

test("truncates an oversized readme", () => {
  const prompt = buildVerificationPrompt({
    ...baseInputs,
    readme: "x".repeat(60_000),
  });
  assert.match(prompt, /…\[truncated\]/);
});
