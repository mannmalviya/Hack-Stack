import "server-only";

import { getProjectArchitecture } from "@/lib/architecture/project-architecture";
import {
  getProjectFeatureVerification,
  type VerificationOutcome,
} from "@/lib/data/feature-verification";
import {
  getProjectEvidence,
  type ProjectCodebase,
  type ProjectTechnology,
} from "@/lib/data/project-evidence";
import { getProjectTeamStats } from "@/lib/data/project-team";
import type { AiCodeAgent } from "@/lib/insights/hackathon-analytics";

/** Caps keep the rail cards glanceable; the project page holds the full lists. */
const CONTRIBUTORS_SHOWN = 4;
const LANGUAGES_SHOWN = 4;
const PACKAGES_SHOWN = 6;
const TECHNOLOGIES_SHOWN = 6;

export type ReelTeamAnalysis =
  | { state: "unavailable" }
  | {
      state: "ready";
      commitCount: number;
      additions: number;
      deletions: number;
      contributors: Array<{
        githubUserId: number;
        githubLogin: string;
        displayName: string;
        commitCount: number;
      }>;
      hiddenContributorCount: number;
    };

export type ReelFeatureCheck = {
  name: string;
  outcome: VerificationOutcome;
};

export type ReelFeatures = {
  /** All verified features, name + outcome, already sorted strongest-first. */
  items: ReelFeatureCheck[];
  /** Per-outcome tallies in a fixed order, empty outcomes dropped. */
  counts: Array<{ outcome: VerificationOutcome; count: number }>;
};

export type ReelAnalysis = {
  /** False when no repository was indexed — claims are then unchecked, not unsupported. */
  hasIndexedRepository: boolean;
  team: ReelTeamAnalysis;
  languages: Array<{ name: string; share: number }>;
  packages: { top: string[]; totalCount: number };
  agents: AiCodeAgent[];
  codebase: ProjectCodebase;
  technologies: {
    items: ProjectTechnology[];
    hiddenCount: number;
    detectedCount: number;
    totalCount: number;
  };
  /** Null unless the AI feature-verification run produced results to show. */
  features: ReelFeatures | null;
};

// Strongest evidence first, matching getProjectFeatureVerification's own order.
const FEATURE_OUTCOME_ORDER = [
  "verified",
  "code_supported",
  "claimed_only",
  "blocked",
] as const;

/**
 * The compact slice of the project page's Analysis section that the reel side
 * rails show beside the demo video. Composed from the same loaders as the
 * project page so both surfaces always agree; trimming to card size happens
 * here so the client never downloads the full lists.
 */
export async function getReelAnalysis(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ReelAnalysis | null> {
  const [evidence, teamStats, architecture, featureReport] = await Promise.all([
    getProjectEvidence(hackathonSlug, projectSlug),
    getProjectTeamStats(hackathonSlug, projectSlug),
    getProjectArchitecture(hackathonSlug, projectSlug),
    getProjectFeatureVerification(hackathonSlug, projectSlug),
  ]);
  if (!evidence) return null;

  // Only surface the feature-check box when a run actually produced verdicts;
  // every "no repo / not run / still running" state simply hides it on a reel.
  const featureItems: ReelFeatureCheck[] =
    featureReport && featureReport.hasRepository && featureReport.features.length > 0
      ? featureReport.features.map((feature) => ({
          name: feature.featureName,
          outcome: feature.verificationOutcome,
        }))
      : [];
  const features: ReelFeatures | null =
    featureItems.length > 0
      ? {
          items: featureItems,
          counts: FEATURE_OUTCOME_ORDER.flatMap((outcome) => {
            const count = featureItems.filter((feature) => feature.outcome === outcome).length;
            return count > 0 ? [{ outcome, count }] : [];
          }),
        }
      : null;

  const rankedContributors =
    teamStats.state === "ready"
      ? [...teamStats.contributors].sort(
          (left, right) => right.creditedCommitCount - left.creditedCommitCount,
        )
      : [];

  const team: ReelTeamAnalysis =
    teamStats.state === "ready"
      ? {
          state: "ready",
          commitCount: teamStats.team.commitCount,
          additions: teamStats.team.additions,
          deletions: teamStats.team.deletions,
          contributors: rankedContributors.slice(0, CONTRIBUTORS_SHOWN).map((contributor) => ({
            githubUserId: contributor.githubUserId,
            githubLogin: contributor.githubLogin,
            displayName: contributor.displayName,
            commitCount: contributor.creditedCommitCount,
          })),
          hiddenContributorCount: Math.max(0, rankedContributors.length - CONTRIBUTORS_SHOWN),
        }
      : { state: "unavailable" };

  // Detected-first mirrors the evidence list's emphasis on what the code shows.
  const rankedTechnologies = [...evidence.technologies].sort(
    (left, right) =>
      Number(right.evidence === "detected") - Number(left.evidence === "detected"),
  );

  const runtimePackages = architecture
    ? [...new Set(architecture.manifests.flatMap((manifest) => manifest.runtime))]
    : [];

  return {
    hasIndexedRepository: evidence.hasIndexedRepository,
    team,
    languages: (architecture?.languages ?? [])
      .slice(0, LANGUAGES_SHOWN)
      .map((language) => ({ name: language.name, share: language.share })),
    packages: {
      top: runtimePackages.slice(0, PACKAGES_SHOWN),
      totalCount: architecture
        ? architecture.manifests.reduce((total, manifest) => total + manifest.totalCount, 0)
        : 0,
    },
    agents: evidence.agents.map((signal) => signal.agent),
    codebase: evidence.codebase,
    technologies: {
      items: rankedTechnologies.slice(0, TECHNOLOGIES_SHOWN),
      hiddenCount: Math.max(0, rankedTechnologies.length - TECHNOLOGIES_SHOWN),
      detectedCount: evidence.technologies.filter(
        (technology) => technology.evidence === "detected",
      ).length,
      totalCount: evidence.technologies.length,
    },
    features,
  };
}
