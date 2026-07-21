// Builds the single prompt handed to `claude -p`, which runs inside a fresh
// clone of the project's repository (cwd = clone dir). Pure and unit-testable.

export type ClaimInputs = {
  name: string;
  tagline: string | null;
  description: string | null;
  builtWith: string[];
  inspiration: string | null;
  whatItDoes: string | null;
  readme: string | null;
};

// Devpost fields and READMEs can be large; cap each section so a single verbose
// project cannot blow up the prompt.
const MAX_FIELD_CHARS = 8_000;
const MAX_README_CHARS = 40_000;

function truncate(value: string | null, max: number): string {
  if (!value) return "(none provided)";
  const trimmed = value.trim();
  if (!trimmed) return "(none provided)";
  return trimmed.length > max
    ? `${trimmed.slice(0, max)}\n…[truncated]`
    : trimmed;
}

function section(label: string, body: string): string {
  return `--- ${label} ---\n${body}\n`;
}

export function buildVerificationPrompt(inputs: ClaimInputs): string {
  const builtWith =
    inputs.builtWith.length > 0
      ? inputs.builtWith.join(", ")
      : "(none provided)";

  return [
    "You are verifying which of a hackathon project's CLAIMED features are actually implemented in its code.",
    "You are running inside a fresh, read-only clone of the project's repository. Your current working directory IS that repository.",
    "",
    "Rules (these are hard product constraints):",
    "- Distinguish implemented code from mere claims. A feature is only 'verified' if you find code that actually implements it.",
    "- Every non-empty evidence citation must point at a real file that exists in this clone. Never invent file paths or line numbers.",
    "- Never claim certainty when the supporting code, demo, or source is absent.",
    "- Use only your Read, Grep, and Glob tools to inspect the code. Do not execute, build, or run anything.",
    "- Work efficiently: this is a fast triage, not an exhaustive audit. Use targeted Grep/Glob to jump straight to the code relevant to each feature rather than reading the whole repository, and stop investigating a feature the moment you have enough to judge it. A handful of focused searches per feature is plenty. Do not open large files in full when a scoped search will answer the question, and do not go deeper than needed to assign an outcome.",
    "- Do not use em dashes (—) anywhere in the text you write (feature names, claims, rationales). Use commas, periods, parentheses, or a colon instead.",
    "",
    "Project claims (from Devpost and the README):",
    section("PROJECT NAME", truncate(inputs.name, MAX_FIELD_CHARS)),
    section("TAGLINE", truncate(inputs.tagline, MAX_FIELD_CHARS)),
    section("DESCRIPTION", truncate(inputs.description, MAX_FIELD_CHARS)),
    section("BUILT WITH", builtWith),
    section("INSPIRATION", truncate(inputs.inspiration, MAX_FIELD_CHARS)),
    section("WHAT IT DOES", truncate(inputs.whatItDoes, MAX_FIELD_CHARS)),
    section("README", truncate(inputs.readme, MAX_README_CHARS)),
    "Task, in order:",
    "1. From the claims above, derive a concise list of concrete claimed features. Deduplicate overlapping claims. Tag each with claimSource 'devpost' or 'readme' depending on where the claim came from.",
    "2. For each feature, search the codebase (Read/Grep/Glob) for supporting implementation.",
    "3. Assign EXACTLY ONE verificationOutcome from this closed set:",
    "   - 'verified': the feature is demonstrably implemented and wired up in the code.",
    "   - 'code_supported': plausible/partial code exists but you could not confirm it end-to-end.",
    "   - 'claimed_only': no supporting code was found.",
    "   - 'blocked': you could not check (the relevant area is missing, external-only, or inaccessible).",
    "4. Cite evidence. For 'verified'/'code_supported', list one or more { file, line, rationale } citations (line may be null). For 'claimed_only'/'blocked', evidence MUST be an empty array [].",
    "5. Set confidence to 'high', 'medium', or 'low'.",
    "",
    "Output ONLY a single JSON object, with no prose and no markdown code fences, matching exactly this shape:",
    '{ "features": [ { "featureName": string, "featureClaim": string, "claimSource": "devpost"|"readme", "verificationOutcome": "verified"|"code_supported"|"claimed_only"|"blocked", "confidence": "high"|"medium"|"low", "evidence": [ { "file": string, "line": number|null, "rationale": string } ] } ] }',
    "",
    "Example of one element:",
    '{ "featureName": "Email magic-link login", "featureClaim": "Users sign in with a magic link", "claimSource": "devpost", "verificationOutcome": "verified", "confidence": "high", "evidence": [ { "file": "lib/auth/magic-link.ts", "line": 12, "rationale": "signInWithOtp is called with the user email" } ] }',
  ].join("\n");
}
