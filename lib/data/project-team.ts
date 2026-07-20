import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  hackathons,
  hackerContributorMetrics,
  hackerInsightRuns,
  hackerTeamMetrics,
  projects,
} from "@/db/schema";

export type ProjectContributor = {
  githubUserId: number;
  githubLogin: string;
  displayName: string;
  creditedCommitCount: number;
  creditedAdditions: number;
  creditedDeletions: number;
};

export type ProjectTeamTotals = {
  commitCount: number;
  additions: number;
  deletions: number;
};

export type ProjectTeamStats =
  | { state: "waiting" }
  | { state: "calculating"; startedAt: string | null }
  | { state: "failed"; error: string }
  /** The run succeeded but covered no repository for this project. */
  | { state: "unavailable" }
  | { state: "ready"; team: ProjectTeamTotals; contributors: ProjectContributor[] };

/**
 * Commit and line stats for one project's GitHub contributors.
 *
 * Run selection mirrors `getHackerInsights`: runs are ordered newest-first and
 * the most recent succeeded one wins, so a failed refresh keeps serving the
 * last good snapshot rather than blanking the tab.
 */
export async function getProjectTeamStats(
  hackathonSlug: string,
  projectSlug: string,
): Promise<ProjectTeamStats> {
  const runs = await db
    .select({
      id: hackerInsightRuns.id,
      status: hackerInsightRuns.status,
      startedAt: hackerInsightRuns.startedAt,
      errorDetail: hackerInsightRuns.errorDetail,
    })
    .from(hackerInsightRuns)
    .innerJoin(hackathons, eq(hackerInsightRuns.hackathonId, hackathons.id))
    .where(eq(hackathons.devpostSlug, hackathonSlug))
    .orderBy(desc(hackerInsightRuns.sourceLastIndexedAt), desc(hackerInsightRuns.id));

  if (runs.length === 0) return { state: "waiting" };

  const latestSucceeded = runs.find((run) => run.status === "succeeded");
  if (!latestSucceeded) {
    const latest = runs[0];
    if (latest.status === "queued" || latest.status === "running") {
      return { state: "calculating", startedAt: latest.startedAt };
    }
    return {
      state: "failed",
      error: latest.errorDetail ?? "The team stats calculation did not complete.",
    };
  }

  const projectFilter = and(
    eq(hackathons.devpostSlug, hackathonSlug),
    eq(projects.devpostSlug, projectSlug),
  );

  const [team] = await db
    .select({
      commitCount: hackerTeamMetrics.commitCount,
      additions: hackerTeamMetrics.additions,
      deletions: hackerTeamMetrics.deletions,
    })
    .from(hackerTeamMetrics)
    .innerJoin(projects, eq(hackerTeamMetrics.projectId, projects.id))
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(eq(hackerTeamMetrics.runId, latestSucceeded.id), projectFilter))
    .limit(1);

  // A project with no indexed repository is skipped by the calculation entirely,
  // so it has no row at all rather than a zeroed one.
  if (!team) return { state: "unavailable" };

  const contributors = await db
    .select({
      githubUserId: hackerContributorMetrics.githubUserId,
      githubLogin: hackerContributorMetrics.githubLogin,
      displayName: hackerContributorMetrics.displayName,
      creditedCommitCount: hackerContributorMetrics.creditedCommitCount,
      creditedAdditions: hackerContributorMetrics.creditedAdditions,
      creditedDeletions: hackerContributorMetrics.creditedDeletions,
    })
    .from(hackerContributorMetrics)
    .innerJoin(projects, eq(hackerContributorMetrics.projectId, projects.id))
    .innerJoin(hackathons, eq(projects.hackathonId, hackathons.id))
    .where(and(eq(hackerContributorMetrics.runId, latestSucceeded.id), projectFilter))
    .orderBy(desc(hackerContributorMetrics.creditedCommitCount));

  return { state: "ready", team, contributors };
}
