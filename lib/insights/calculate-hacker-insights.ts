import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  hackerInsightRuns,
  hackerTeamMetrics,
  hackathons,
} from "@/db/schema";

const ERROR_DETAIL_LIMIT = 4000;

export type HackerInsightsCalculationResult = {
  runId: number | null;
  status: "succeeded" | "failed";
  error: string | null;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Builds a complete, replaceable snapshot from locally stored GitHub data.
 * Team totals read each commit once; contributor totals join every resolved
 * author so co-authors receive the same commit activity as the primary author.
 */
export async function calculateHackerInsights(input: {
  hackathonId: string;
  sourceLastIndexedAt: string;
}): Promise<HackerInsightsCalculationResult> {
  const [hackathon] = await db
    .select({ startsAt: hackathons.startsAt, endsAt: hackathons.endsAt })
    .from(hackathons)
    .where(eq(hackathons.id, input.hackathonId))
    .limit(1);

  if (!hackathon?.startsAt || !hackathon.endsAt) {
    return {
      runId: null,
      status: "failed",
      error: "Official hackathon start and end dates are required",
    };
  }

  const inserted = await db
    .insert(hackerInsightRuns)
    .values({
      hackathonId: input.hackathonId,
      sourceLastIndexedAt: input.sourceLastIndexedAt,
      windowStartsAt: hackathon.startsAt,
      windowEndsAt: hackathon.endsAt,
    })
    .onConflictDoNothing({
      target: [hackerInsightRuns.hackathonId, hackerInsightRuns.sourceLastIndexedAt],
    })
    .returning({ id: hackerInsightRuns.id, status: hackerInsightRuns.status });

  const [existing] = inserted.length > 0
    ? inserted
    : await db
      .select({ id: hackerInsightRuns.id, status: hackerInsightRuns.status })
      .from(hackerInsightRuns)
      .where(and(
        eq(hackerInsightRuns.hackathonId, input.hackathonId),
        eq(hackerInsightRuns.sourceLastIndexedAt, input.sourceLastIndexedAt),
      ))
      .orderBy(desc(hackerInsightRuns.id))
      .limit(1);

  if (!existing) {
    return { runId: null, status: "failed", error: "Could not create insight run" };
  }
  if (existing.status === "succeeded") {
    return { runId: existing.id, status: "succeeded", error: null };
  }

  const startedAt = new Date().toISOString();
  await db
    .update(hackerInsightRuns)
    .set({
      status: "running",
      startedAt,
      completedAt: null,
      errorDetail: null,
      updatedAt: startedAt,
    })
    .where(eq(hackerInsightRuns.id, existing.id));

  try {
    await db.transaction(async (tx) => {
      // A full gallery import and a targeted single-project import can reach
      // this concurrently for the same hackathon. Without serialization their
      // delete/insert rebuilds interleave and leave duplicated metric rows.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${input.hackathonId}, 0))`,
      );

      await tx
        .delete(hackerTeamMetrics)
        .where(eq(hackerTeamMetrics.runId, existing.id));

      await tx.execute(sql`
        with eligible_projects as (
          select distinct p.id as project_id
          from public.projects p
          inner join private.project_repositories pr on pr.project_id = p.id
          where p.hackathon_id = ${input.hackathonId}
            and p.ingestion_status in ('succeeded', 'partial')
            and p.ingestion_completed_at is not null
        ),
        eligible_commits as (
          select
            ep.project_id,
            rc.id as commit_id,
            coalesce(rc.additions, 0)::bigint as additions,
            coalesce(rc.deletions, 0)::bigint as deletions
          from eligible_projects ep
          inner join private.project_repositories pr on pr.project_id = ep.project_id
          inner join private.repository_commits rc on rc.project_repository_id = pr.id
          where rc.authored_at >= ${hackathon.startsAt}
            and rc.authored_at <= ${hackathon.endsAt}
        ),
        commit_stats as (
          select
            ec.project_id,
            count(*)::bigint as commit_count,
            sum(ec.additions)::bigint as additions,
            sum(ec.deletions)::bigint as deletions
          from eligible_commits ec
          group by ec.project_id
        )
        insert into private.hacker_team_metrics (
          run_id,
          project_id,
          commit_count,
          additions,
          deletions
        )
        select
          ${existing.id},
          ep.project_id,
          coalesce(cs.commit_count, 0),
          coalesce(cs.additions, 0),
          coalesce(cs.deletions, 0)
        from eligible_projects ep
        left join commit_stats cs on cs.project_id = ep.project_id
      `);

      await tx.execute(sql`
        with eligible_commits as (
          select
            p.id as project_id,
            rc.id as commit_id,
            coalesce(rc.additions, 0)::bigint as additions,
            coalesce(rc.deletions, 0)::bigint as deletions
          from public.projects p
          inner join private.project_repositories pr on pr.project_id = p.id
          inner join private.repository_commits rc on rc.project_repository_id = pr.id
          where p.hackathon_id = ${input.hackathonId}
            and p.ingestion_status in ('succeeded', 'partial')
            and p.ingestion_completed_at is not null
            and rc.authored_at >= ${hackathon.startsAt}
            and rc.authored_at <= ${hackathon.endsAt}
        )
        insert into private.hacker_contributor_metrics (
          run_id,
          project_id,
          github_user_id,
          github_login,
          display_name,
          credited_commit_count,
          credited_additions,
          credited_deletions
        )
        select
          ${existing.id},
          ec.project_id,
          rca.author_github_user_id,
          (array_agg(rca.author_github_login order by ec.commit_id desc))[1],
          (array_agg(
            coalesce(nullif(btrim(rca.author_name), ''), rca.author_github_login)
            order by ec.commit_id desc
          ))[1],
          count(*)::bigint,
          sum(ec.additions)::bigint,
          sum(ec.deletions)::bigint
        from eligible_commits ec
        inner join private.repository_commit_authors rca
          on rca.repository_commit_id = ec.commit_id
        where rca.author_github_user_id is not null
          and nullif(btrim(rca.author_github_login), '') is not null
        group by ec.project_id, rca.author_github_user_id
      `);

      const completedAt = new Date().toISOString();
      await tx
        .update(hackerInsightRuns)
        .set({
          status: "succeeded",
          completedAt,
          errorDetail: null,
          updatedAt: completedAt,
        })
        .where(eq(hackerInsightRuns.id, existing.id));
    });

    return { runId: existing.id, status: "succeeded", error: null };
  } catch (error) {
    const message = errorMessage(error).slice(0, ERROR_DETAIL_LIMIT) || "Calculation failed";
    const completedAt = new Date().toISOString();
    await db
      .update(hackerInsightRuns)
      .set({
        status: "failed",
        completedAt,
        errorDetail: message,
        updatedAt: completedAt,
      })
      .where(eq(hackerInsightRuns.id, existing.id));
    return { runId: existing.id, status: "failed", error: message };
  }
}
