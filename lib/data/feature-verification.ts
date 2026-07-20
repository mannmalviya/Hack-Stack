import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  featureVerificationResults,
  featureVerificationRuns,
  hackathons,
  projectRepositories,
  projects,
} from "@/db/schema";
import type {
  CLAIM_SOURCES,
  CONFIDENCE_LEVELS,
  EvidenceCitation,
  VERIFICATION_OUTCOMES,
} from "@/lib/verification/schema";

export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];
export type ClaimSource = (typeof CLAIM_SOURCES)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type VerifiedFeatureRow = {
  featureName: string;
  featureClaim: string | null;
  claimSource: ClaimSource;
  verificationOutcome: VerificationOutcome;
  confidence: Confidence | null;
  evidence: EvidenceCitation[];
};

export type FeatureVerificationReport = {
  /** False when the project linked no repository — nothing was ever cloneable. */
  hasRepository: boolean;
  /** Latest run's status, or null when no run has been recorded yet. */
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | null;
  completedAt: string | null;
  resolvedCommitSha: string | null;
  errorDetail: string | null;
  features: VerifiedFeatureRow[];
};

// Code-backed outcomes first — an over-claimed feature is what a judge most needs
// to notice, so surface the confirmed ones ahead of the unsupported ones.
const OUTCOME_ORDER: Record<VerificationOutcome, number> = {
  verified: 0,
  code_supported: 1,
  claimed_only: 2,
  blocked: 3,
};

// The evidence column is JSONB written by our own validated pipeline, but coerce
// defensively so a malformed row can never crash the page.
function asEvidence(value: unknown): EvidenceCitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.file !== "string" || typeof record.rationale !== "string") {
      return [];
    }
    return [
      {
        file: record.file,
        line: typeof record.line === "number" ? record.line : null,
        rationale: record.rationale,
      },
    ];
  });
}

/**
 * The most recent feature-verification run for a project and its per-feature
 * results, resolved from the two Devpost slugs. Returns null only when the
 * project itself does not exist; every other state (no repo, no run yet, still
 * running, failed) is represented in the returned report so the UI can explain
 * it rather than showing nothing.
 */
export async function getProjectFeatureVerification(
  hackathonSlug: string,
  projectSlug: string,
): Promise<FeatureVerificationReport | null> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(
      and(
        eq(hackathons.devpostSlug, hackathonSlug),
        eq(projects.devpostSlug, projectSlug),
      ),
    )
    .limit(1);

  if (!project) return null;

  const [repository] = await db
    .select({ id: projectRepositories.id })
    .from(projectRepositories)
    .where(eq(projectRepositories.projectId, project.id))
    .limit(1);

  if (!repository) {
    return {
      hasRepository: false,
      status: null,
      completedAt: null,
      resolvedCommitSha: null,
      errorDetail: null,
      features: [],
    };
  }

  const [run] = await db
    .select({
      id: featureVerificationRuns.id,
      status: featureVerificationRuns.status,
      completedAt: featureVerificationRuns.completedAt,
      resolvedCommitSha: featureVerificationRuns.resolvedCommitSha,
      errorDetail: featureVerificationRuns.errorDetail,
    })
    .from(featureVerificationRuns)
    .where(eq(featureVerificationRuns.projectRepositoryId, repository.id))
    .orderBy(desc(featureVerificationRuns.createdAt))
    .limit(1);

  if (!run) {
    return {
      hasRepository: true,
      status: null,
      completedAt: null,
      resolvedCommitSha: null,
      errorDetail: null,
      features: [],
    };
  }

  const results = await db
    .select({
      featureName: featureVerificationResults.featureName,
      featureClaim: featureVerificationResults.featureClaim,
      claimSource: featureVerificationResults.claimSource,
      verificationOutcome: featureVerificationResults.verificationOutcome,
      confidence: featureVerificationResults.confidence,
      evidence: featureVerificationResults.evidence,
    })
    .from(featureVerificationResults)
    .where(eq(featureVerificationResults.runId, run.id));

  const features: VerifiedFeatureRow[] = results
    .map((row) => ({
      featureName: row.featureName,
      featureClaim: row.featureClaim,
      claimSource: row.claimSource as ClaimSource,
      verificationOutcome: row.verificationOutcome as VerificationOutcome,
      confidence: (row.confidence as Confidence | null) ?? null,
      evidence: asEvidence(row.evidence),
    }))
    .sort(
      (left, right) =>
        OUTCOME_ORDER[left.verificationOutcome] -
          OUTCOME_ORDER[right.verificationOutcome] ||
        left.featureName.localeCompare(right.featureName),
    );

  return {
    hasRepository: true,
    status: run.status as FeatureVerificationReport["status"],
    completedAt: run.completedAt,
    resolvedCommitSha: run.resolvedCommitSha,
    errorDetail: run.errorDetail,
    features,
  };
}
