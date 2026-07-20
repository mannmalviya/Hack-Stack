import assert from "node:assert/strict";
import test from "node:test";

import { parseClaudeOutput } from "../lib/verification/claude-runner";
import { verificationPayloadSchema } from "../lib/verification/schema";

const feature = {
  featureName: "Magic-link login",
  featureClaim: "Users sign in with an email magic link",
  claimSource: "devpost",
  verificationOutcome: "verified",
  confidence: "high",
  evidence: [{ file: "lib/auth.ts", line: 10, rationale: "signInWithOtp" }],
};

// Wraps a model answer in the CLI's --output-format json envelope.
const envelope = (result: string, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result,
    ...overrides,
  });

test("parses a clean envelope with unfenced JSON", () => {
  const stdout = envelope(JSON.stringify({ features: [feature] }));
  const parsed = parseClaudeOutput(stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ok && parsed.payload.features.length, 1);
});

test("parses model output wrapped in a ```json fence", () => {
  const fenced = "```json\n" + JSON.stringify({ features: [feature] }) + "\n```";
  const parsed = parseClaudeOutput(envelope(fenced));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ok && parsed.payload.features[0].featureName, "Magic-link login");
});

test("recovers JSON preceded by a sentence of prose", () => {
  const withProse =
    "Based on my review, here are the results:\n" +
    JSON.stringify({ features: [feature] });
  const parsed = parseClaudeOutput(envelope(withProse));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ok && parsed.payload.features.length, 1);
});

test("accepts an empty feature list", () => {
  const parsed = parseClaudeOutput(envelope(JSON.stringify({ features: [] })));
  assert.equal(parsed.ok, true);
});

test("fails when the CLI reports an error", () => {
  const parsed = parseClaudeOutput(envelope("", { is_error: true }));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.reason, "cli-reported-error");
});

test("fails when stdout is not JSON", () => {
  const parsed = parseClaudeOutput("not json at all");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.reason, "cli-envelope-not-json");
});

test("fails when the model answer is not JSON", () => {
  const parsed = parseClaudeOutput(envelope("here are the features: ..."));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.reason, "model-output-not-json");
});

test("rejects an invalid verification outcome", () => {
  const bad = { ...feature, verificationOutcome: "definitely-real" };
  const parsed = parseClaudeOutput(envelope(JSON.stringify({ features: [bad] })));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.reason, "model-output-schema-mismatch");
});

test("schema rejects a feature missing a required key", () => {
  const { evidence, ...withoutEvidence } = feature;
  void evidence;
  const result = verificationPayloadSchema.safeParse({
    features: [withoutEvidence],
  });
  assert.equal(result.success, false);
});
