import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  hackerContributorMetrics,
  hackerInsightRuns,
  hackerTeamMetrics,
  hackathons,
  projects,
} from "@/db/schema";
import { getProjectCoverPublicUrl } from "@/lib/supabase/project-covers";

export type HackerTeamLeaderboardRow = {
  projectId: string;
  projectName: string;
  projectSlug: string;
  coverImageUrl: string | null;
  commitCount: number;
  additions: number;
  deletions: number;
};

export type HackerContributorLeaderboardRow = {
  projectId: string;
  projectName: string;
  projectSlug: string;
  githubUserId: number;
  githubLogin: string;
  displayName: string;
  creditedCommitCount: number;
  creditedAdditions: number;
  creditedDeletions: number;
};

export type HackerInsightsData =
  | { state: "waiting" }
  | { state: "calculating"; startedAt: string | null }
  | { state: "failed"; error: string }
  | {
      state: "ready";
      completedAt: string;
      isRefreshing: boolean;
      refreshError: string | null;
      windowStartsAt: string;
      windowEndsAt: string;
      summary: {
        commitCount: number;
        additions: number;
        deletions: number;
      };
      teams: HackerTeamLeaderboardRow[];
      contributors: HackerContributorLeaderboardRow[];
    };

export async function getHackerInsights(slug: string): Promise<HackerInsightsData> {
  const runs = await db
    .select({
      id: hackerInsightRuns.id,
      status: hackerInsightRuns.status,
      startedAt: hackerInsightRuns.startedAt,
      completedAt: hackerInsightRuns.completedAt,
      errorDetail: hackerInsightRuns.errorDetail,
      windowStartsAt: hackerInsightRuns.windowStartsAt,
      windowEndsAt: hackerInsightRuns.windowEndsAt,
    })
    .from(hackerInsightRuns)
    .innerJoin(hackathons, eq(hackerInsightRuns.hackathonId, hackathons.id))
    .where(eq(hackathons.devpostSlug, slug))
    .orderBy(desc(hackerInsightRuns.sourceLastIndexedAt), desc(hackerInsightRuns.id));

  if (runs.length === 0) return { state: "waiting" };

  const latest = runs[0];
  const latestSucceeded = runs.find((run) => run.status === "succeeded");
  if (!latestSucceeded) {
    if (latest.status === "queued" || latest.status === "running") {
      return { state: "calculating", startedAt: latest.startedAt };
    }
    return {
      state: "failed",
      error: latest.errorDetail ?? "The leaderboard calculation did not complete.",
    };
  }

  const [teams, contributors] = await Promise.all([
    db
      .select({
        projectId: hackerTeamMetrics.projectId,
        projectName: projects.name,
        projectSlug: projects.devpostSlug,
        coverImagePath: projects.coverImagePath,
        commitCount: hackerTeamMetrics.commitCount,
        additions: hackerTeamMetrics.additions,
        deletions: hackerTeamMetrics.deletions,
      })
      .from(hackerTeamMetrics)
      .innerJoin(projects, eq(hackerTeamMetrics.projectId, projects.id))
      .where(eq(hackerTeamMetrics.runId, latestSucceeded.id)),
    db
      .select({
        projectId: hackerContributorMetrics.projectId,
        projectName: projects.name,
        projectSlug: projects.devpostSlug,
        githubUserId: hackerContributorMetrics.githubUserId,
        githubLogin: hackerContributorMetrics.githubLogin,
        displayName: hackerContributorMetrics.displayName,
        creditedCommitCount: hackerContributorMetrics.creditedCommitCount,
        creditedAdditions: hackerContributorMetrics.creditedAdditions,
        creditedDeletions: hackerContributorMetrics.creditedDeletions,
      })
      .from(hackerContributorMetrics)
      .innerJoin(projects, eq(hackerContributorMetrics.projectId, projects.id))
      .where(eq(hackerContributorMetrics.runId, latestSucceeded.id)),
  ]);

  const teamRows = teams.map(({ coverImagePath, ...team }) => ({
    ...team,
    coverImageUrl: getProjectCoverPublicUrl(coverImagePath),
  }));

  return {
    state: "ready",
    completedAt: latestSucceeded.completedAt!,
    isRefreshing: latest.id !== latestSucceeded.id
      && (latest.status === "queued" || latest.status === "running"),
    refreshError: latest.id !== latestSucceeded.id && latest.status === "failed"
      ? latest.errorDetail ?? "The latest refresh failed."
      : null,
    windowStartsAt: latestSucceeded.windowStartsAt,
    windowEndsAt: latestSucceeded.windowEndsAt,
    summary: {
      commitCount: teamRows.reduce((total, team) => total + team.commitCount, 0),
      additions: teamRows.reduce((total, team) => total + team.additions, 0),
      deletions: teamRows.reduce((total, team) => total + team.deletions, 0),
    },
    teams: teamRows,
    contributors,
  };
}
