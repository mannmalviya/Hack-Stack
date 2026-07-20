import { access } from "node:fs/promises";
import path from "node:path";

import { getProjectClaims } from "./claim-sources";
import { cloneRepo, readCloneReadme } from "./clone";
import { runClaudeVerification } from "./claude-runner";
import { buildVerificationPrompt } from "./prompt";
import type { VerifiedFeature } from "./schema";

export type VerificationRunResult = {
  status: "succeeded" | "failed";
  resolvedCommitSha: string | null;
  features: VerifiedFeature[];
  errorDetail: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Confirms a cited path exists inside the clone (and does not escape it), so a
// hallucinated citation cannot masquerade as evidence.
async function citationExists(dir: string, file: string): Promise<boolean> {
  const resolved = path.resolve(dir, file);
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) return false;
  try {
    await access(resolved);
    return true;
  } catch {
    return false;
  }
}

// Drops evidence citations pointing at files absent from the clone. A 'verified'
// feature left with no real evidence is downgraded to 'code_supported' — we saw
// a claim of proof, but the proof did not check out.
async function groundFeatures(
  dir: string,
  features: VerifiedFeature[],
): Promise<VerifiedFeature[]> {
  return Promise.all(
    features.map(async (feature) => {
      const evidence = [];
      for (const citation of feature.evidence) {
        if (await citationExists(dir, citation.file)) evidence.push(citation);
      }
      const outcome =
        feature.verificationOutcome === "verified" && evidence.length === 0
          ? "code_supported"
          : feature.verificationOutcome;
      return { ...feature, evidence, verificationOutcome: outcome };
    }),
  );
}

/**
 * Verifies one project's claimed features against a fresh clone of its repo.
 * Gathers claim text, clones, runs the Claude agent, grounds the citations, and
 * always removes the clone. Returns a typed result + status; never writes to the
 * database and never throws (failures come back as status 'failed').
 */
export async function verifyProjectFeatures(
  projectId: string,
  sourceUrl: string,
  token: string | undefined,
): Promise<VerificationRunResult> {
  const claims = await getProjectClaims(projectId);
  if (!claims) {
    return {
      status: "failed",
      resolvedCommitSha: null,
      features: [],
      errorDetail: "Project claims not found",
    };
  }

  let clone;
  try {
    clone = await cloneRepo(sourceUrl, token);
  } catch (error) {
    return {
      status: "failed",
      resolvedCommitSha: null,
      features: [],
      errorDetail: errorMessage(error),
    };
  }

  try {
    const readme = await readCloneReadme(clone.dir);
    const prompt = buildVerificationPrompt({ ...claims, readme });
    const result = await runClaudeVerification(prompt, clone.dir);

    if (!result.ok) {
      return {
        status: "failed",
        resolvedCommitSha: clone.resolvedCommitSha,
        features: [],
        errorDetail: result.raw
          ? `${result.reason}: ${result.raw}`
          : result.reason,
      };
    }

    const features = await groundFeatures(clone.dir, result.payload.features);
    return {
      status: "succeeded",
      resolvedCommitSha: clone.resolvedCommitSha,
      features,
      errorDetail: null,
    };
  } catch (error) {
    return {
      status: "failed",
      resolvedCommitSha: clone.resolvedCommitSha,
      features: [],
      errorDetail: errorMessage(error),
    };
  } finally {
    await clone.cleanup();
  }
}
