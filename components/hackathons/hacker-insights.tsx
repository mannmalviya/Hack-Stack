"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink, Search, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  HackerContributorLeaderboardRow,
  HackerInsightsData,
  HackerTeamLeaderboardRow,
} from "@/lib/data/hacker-insights";
import type { IndexingStage, IndexingStatus } from "@/lib/data/hackathons";

type Scope = "teams" | "contributors";
type Metric = "commitCount" | "additions" | "deletions";

type ContributorAggregate = Omit<
  HackerContributorLeaderboardRow,
  "projectId" | "projectName" | "projectSlug"
> & {
  projectId: string | null;
  projectName: string;
  projectSlug: string | null;
  projectNames: string[];
  /** A contributor may have won on more than one team. */
  winningTracks: string[];
};

const PAGE_SIZE = 25;
const integerFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const metrics: Array<{ value: Metric; label: string }> = [
  { value: "commitCount", label: "Commits" },
  { value: "additions", label: "+ Lines added" },
  { value: "deletions", label: "- Lines deleted" },
];

function metricTone(metric: Metric) {
  if (metric === "additions") return "text-emerald-600 dark:text-emerald-400";
  if (metric === "deletions") return "text-red-600 dark:text-red-400";
  return "";
}

function metricBarTone(metric: Metric) {
  if (metric === "additions") return "bg-emerald-500";
  if (metric === "deletions") return "bg-red-500";
  return "bg-accent";
}

function formatMetric(value: number, metric: Metric, compact = false) {
  const formatted = compact
    ? compactFormatter.format(value)
    : integerFormatter.format(value);
  if (metric === "additions") return `+${formatted}`;
  if (metric === "deletions") return `-${formatted}`;
  return formatted;
}

function metricValue(
  row: HackerTeamLeaderboardRow | ContributorAggregate,
  scope: Scope,
  metric: Metric,
) {
  if (scope === "teams") return (row as HackerTeamLeaderboardRow)[metric];
  const contributor = row as ContributorAggregate;
  if (metric === "commitCount") return contributor.creditedCommitCount;
  if (metric === "additions") return contributor.creditedAdditions;
  return contributor.creditedDeletions;
}

function LoadingState({
  stage,
  state,
}: {
  stage: IndexingStage | null;
  state: "waiting" | "calculating";
}) {
  const calculating = state === "calculating" || stage === "calculating_hacker_insights";
  const title = calculating
    ? "Leaderboard is being calculated"
    : stage === "ingesting_repositories"
      ? "Waiting for GitHub ingestion"
      : "Hacker Insights are not ready yet";
  const description = calculating
    ? "We are aggregating commit activity for every team and GitHub contributor. This page updates automatically when the leaderboard is ready."
    : stage === "ingesting_repositories"
      ? "The leaderboard calculation will begin as soon as every available GitHub repository has been ingested."
      : "Run the hackathon ingestion workflow to generate the team and contributor leaderboards.";

  return (
    <section aria-live="polite" className="border border-accent/35 bg-accent/[0.05] px-6 py-14 text-center">
      <div className="mx-auto flex w-fit items-end gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="block w-1.5 animate-pulse bg-accent"
            style={{ height: `${12 + index * 5}px`, animationDelay: `${index * 140}ms` }}
          />
        ))}
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">
        Hacker Insights pipeline
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted">{description}</p>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  valueClassName = "",
}: {
  label: string;
  value: string;
  caption: string;
  valueClassName?: string;
}) {
  return (
    <div className="border border-border bg-surface px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-[-0.045em] tabular-nums ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-[11px] text-muted">{caption}</p>
    </div>
  );
}

function LeaderboardAvatar({
  src,
  alt,
  fallback,
  round = false,
  external = false,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  round?: boolean;
  external?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative grid size-8 shrink-0 place-items-center overflow-hidden bg-foreground/[0.07] font-mono text-[10px] font-semibold uppercase text-muted ${round ? "rounded-full" : ""}`}>
      {src && !failed && external ? (
        // GitHub's avatar CDN is already optimized for these tiny images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={32}
          height={32}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="32px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </span>
  );
}

/** Green trophy only; the track itself lives in the tooltip. */
function WinnerTrophy({ track, className }: { track: string | null; className?: string }) {
  const label = track ? `Winner — ${track}` : "Winner";
  return (
    <span title={label} className={`inline-flex shrink-0 ${className ?? ""}`}>
      <Trophy size={12} className="text-accent" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function VerticalGraphEntry({
  href,
  externalLink = false,
  name,
  imageUrl,
  imageExternal = false,
  roundImage = false,
  isWinner = false,
  winningTrack = null,
  value,
  metric,
  metricLabel,
  graphMax,
}: {
  href: string;
  externalLink?: boolean;
  name: string;
  imageUrl: string | null;
  imageExternal?: boolean;
  roundImage?: boolean;
  isWinner?: boolean;
  winningTrack?: string | null;
  value: number;
  metric: Metric;
  metricLabel: string;
  graphMax: number;
}) {
  const label = `${name}${isWinner ? " (winner)" : ""}, ${formatMetric(value, metric)} ${metricLabel.toLowerCase()}`;
  const content = (
    <>
      <span className="relative z-10 flex h-64 items-end" aria-hidden="true">
        <span
          className={`relative block w-full transition-opacity group-hover:opacity-75 ${metricBarTone(metric)}`}
          style={{
            height: `${(value / graphMax) * 100}%`,
            minHeight: value > 0 ? "2px" : undefined,
          }}
        >
          <span className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap bg-foreground px-2 py-1 font-mono text-[10px] font-semibold tabular-nums text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${metric === "additions" ? "!text-emerald-300" : metric === "deletions" ? "!text-red-300" : ""}`}>
            {formatMetric(value, metric)}
          </span>
        </span>
      </span>
      <span className="flex h-40 flex-col items-center border-t border-border pt-2">
        <LeaderboardAvatar
          src={imageUrl}
          alt={`${name} avatar`}
          fallback={name.slice(0, 2)}
          round={roundImage}
          external={imageExternal}
        />
        {isWinner ? <WinnerTrophy track={winningTrack} className="mt-1.5" /> : null}
        <span
          className="mt-2 max-h-24 overflow-hidden text-[10px] leading-3 text-muted group-hover:text-accent-text"
          style={{ writingMode: "vertical-rl" }}
        >
          {name}
        </span>
      </span>
    </>
  );

  const className = "group relative flex w-10 shrink-0 flex-col hover:z-30 focus-visible:z-30";
  if (externalLink) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={label}
        className={className}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} title={label} aria-label={label} className={className}>
      {content}
    </Link>
  );
}

export function HackerInsights({
  data,
  hackathonSlug,
  indexingStage,
  indexingStatus,
}: {
  data: HackerInsightsData;
  hackathonSlug: string;
  indexingStage: IndexingStage | null;
  indexingStatus: IndexingStatus;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [scope, setScope] = useState<Scope>("teams");
  const [metric, setMetric] = useState<Metric>("commitCount");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pipelineActive = indexingStatus === "running"
    || data.state === "calculating"
    || (data.state === "ready" && data.isRefreshing);

  useEffect(() => {
    if (!pipelineActive) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isRefreshing) return;
      startRefresh(() => router.refresh());
    }, 2000);
    return () => window.clearInterval(interval);
  }, [isRefreshing, pipelineActive, router]);

  const contributorRows = useMemo(() => {
    if (data.state !== "ready") return [];
    const grouped = new Map<number, ContributorAggregate>();
    for (const row of data.contributors) {
      const current = grouped.get(row.githubUserId);
      if (!current) {
        grouped.set(row.githubUserId, {
          ...row,
          projectNames: [row.projectName],
          winningTracks: row.isWinner && row.winningTrack ? [row.winningTrack] : [],
        });
        continue;
      }
      current.isWinner = current.isWinner || row.isWinner;
      if (row.isWinner && row.winningTrack && !current.winningTracks.includes(row.winningTrack)) {
        current.winningTracks.push(row.winningTrack);
      }
      current.creditedCommitCount += row.creditedCommitCount;
      current.creditedAdditions += row.creditedAdditions;
      current.creditedDeletions += row.creditedDeletions;
      if (!current.projectNames.includes(row.projectName)) {
        current.projectNames.push(row.projectName);
        current.projectId = null;
        current.projectName = "Multiple teams";
        current.projectSlug = null;
      }
    }
    return [...grouped.values()];
  }, [data]);

  if (data.state === "waiting" || data.state === "calculating") {
    return <LoadingState stage={indexingStage} state={data.state} />;
  }
  if (data.state === "failed") {
    return (
      <section className="border border-amber-400/40 bg-amber-400/[0.07] px-6 py-12 text-center">
        <AlertTriangle className="mx-auto text-amber-600" size={24} aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Leaderboard calculation failed</h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted">{data.error}</p>
      </section>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const rankedTeams = data.teams
    .filter((row) => row.projectName.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => metricValue(b, "teams", metric) - metricValue(a, "teams", metric) || a.projectName.localeCompare(b.projectName));
  const rankedContributors = contributorRows
    .filter((row) => `${row.displayName} ${row.githubLogin} ${row.projectNames.join(" ")}`.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => metricValue(b, "contributors", metric) - metricValue(a, "contributors", metric) || a.githubLogin.localeCompare(b.githubLogin));
  const activeMetricLabel = metrics.find((option) => option.value === metric)!.label;
  const graphRows = scope === "teams" ? rankedTeams : rankedContributors;
  const graphMax = Math.max(
    1,
    ...graphRows.map((row) => metricValue(row, scope, metric)),
  );
  const yAxisTicks = Array.from({ length: 5 }, (_, index) => {
    const position = index / 4;
    return {
      position,
      value: Math.round(graphMax * (1 - position)),
    };
  });
  const rows = scope === "teams" ? rankedTeams : rankedContributors;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rankByValue = new Map<number, number>();
  let previousValue: number | null = null;
  let denseRank = 0;
  rows.forEach((row, index) => {
    const value = metricValue(row, scope, metric);
    if (previousValue === null || value !== previousValue) {
      denseRank += 1;
      previousValue = value;
    }
    rankByValue.set(index, denseRank);
  });

  return (
    <section aria-labelledby="hackers-insights-heading" className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">Repository activity</p>
          <h2 id="hackers-insights-heading" className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Hackers Insights</h2>
          <p className="mt-2 text-xs text-muted">
            Activity from {dateFormatter.format(new Date(data.windowStartsAt))} to {dateFormatter.format(new Date(data.windowEndsAt))}.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Calculated {dateFormatter.format(new Date(data.completedAt))}
        </p>
      </div>

      {data.refreshError && (
        <div className="border-l-2 border-amber-500 bg-amber-400/[0.07] px-4 py-3 text-xs text-muted">
          The newest refresh could not be calculated. Showing the latest usable leaderboard.
        </div>
      )}
      {data.isRefreshing && (
        <div aria-live="polite" className="flex items-center gap-3 border-l-2 border-accent bg-accent/[0.06] px-4 py-3 text-xs text-muted">
          <span className="flex items-end gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span key={index} className="block w-1 animate-pulse bg-accent" style={{ height: `${7 + index * 3}px`, animationDelay: `${index * 120}ms` }} />
            ))}
          </span>
          A refreshed leaderboard is being calculated. Showing the previous completed results for now.
        </div>
      )}

      <div className="grid gap-px bg-border sm:grid-cols-3">
        <SummaryCard label="Commits" value={compactFormatter.format(data.summary.commitCount)} caption="Across all projects" />
        <SummaryCard label="Lines added" value={formatMetric(data.summary.additions, "additions", true)} valueClassName={metricTone("additions")} caption="Across all projects" />
        <SummaryCard label="Lines deleted" value={formatMetric(data.summary.deletions, "deletions", true)} valueClassName={metricTone("deletions")} caption="Across all projects" />
      </div>

      <div className="border border-border bg-surface">
        <div className="grid gap-4 border-b border-border p-4 lg:grid-cols-[auto_220px_minmax(180px,1fr)] lg:items-end">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Leaderboard</p>
            <div className="flex border border-border p-0.5">
              {(["teams", "contributors"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors ${scope === value ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs text-muted">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em]">Metric</span>
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as Metric)}
              className="h-9 w-full border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-accent"
            >
              {metrics.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em]">Search</span>
            <span className="flex h-9 items-center gap-2 border border-border bg-background px-2 focus-within:border-accent">
              <Search size={13} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a team or contributor"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
              />
            </span>
          </label>
        </div>

          <section aria-labelledby="activity-graph" className="border-b border-border p-4">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  All {scope}
                </p>
                <h3 id="activity-graph" className="mt-1 text-sm font-semibold">
                  {activeMetricLabel}
                </h3>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {graphRows.length} {scope}
              </p>
            </div>

            {graphRows.length > 0 ? (
              <div className="flex pb-2">
                <div className="w-16 shrink-0" aria-hidden="true">
                  <div className="relative h-64 border-r border-border">
                    {yAxisTicks.map((tick) => (
                      <span
                        key={tick.position}
                        className="absolute right-2 font-mono text-[9px] tabular-nums text-muted"
                        style={{
                          top: `${tick.position * 100}%`,
                          transform: tick.position === 0
                            ? undefined
                            : tick.position === 1
                              ? "translateY(-100%)"
                              : "translateY(-50%)",
                        }}
                      >
                        {tick.value === 0 ? "0" : formatMetric(tick.value, metric, true)}
                      </span>
                    ))}
                  </div>
                  <div className="h-40 border-r border-t border-border" />
                </div>

                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="relative min-w-max">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-64" aria-hidden="true">
                      {yAxisTicks.map((tick) => (
                        <span
                          key={tick.position}
                          className="absolute inset-x-0 border-t border-border/70"
                          style={{ top: `${tick.position * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex min-w-max items-end gap-0">
                      {graphRows.map((row) => {
                        if (scope === "teams") {
                          const team = row as HackerTeamLeaderboardRow;
                          return (
                            <VerticalGraphEntry
                              key={team.projectId}
                              href={`/hackathons/${hackathonSlug}/${team.projectSlug}`}
                              name={team.projectName}
                              imageUrl={team.coverImageUrl}
                              isWinner={team.isWinner}
                              winningTrack={team.winningTrack}
                              value={metricValue(team, "teams", metric)}
                              metric={metric}
                              metricLabel={activeMetricLabel}
                              graphMax={graphMax}
                            />
                          );
                        }
                        const contributor = row as ContributorAggregate;
                        return (
                          <VerticalGraphEntry
                            key={contributor.githubUserId}
                            href={`https://github.com/${encodeURIComponent(contributor.githubLogin)}`}
                            externalLink
                            name={contributor.displayName}
                            imageUrl={`https://avatars.githubusercontent.com/u/${contributor.githubUserId}?v=4`}
                            imageExternal
                            roundImage
                            isWinner={contributor.isWinner}
                            winningTrack={contributor.winningTracks.join(" · ") || null}
                            value={metricValue(contributor, "contributors", metric)}
                            metric={metric}
                            metricLabel={activeMetricLabel}
                            graphMax={graphMax}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <p className="py-10 text-center text-xs text-muted">
                  No {scope} match this search.
                </p>
            )}
          </section>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-16 px-4 py-3 font-normal">Rank</th>
                <th className="px-4 py-3 font-normal">{scope === "teams" ? "Team" : "Contributor"}</th>
                {scope === "contributors" && <th className="px-4 py-3 font-normal">Team</th>}
                {metrics.map((option) => (
                  <th key={option.value} className={`px-4 py-3 text-right font-normal ${metricTone(option.value)} ${metric === option.value && option.value !== "additions" && option.value !== "deletions" ? "text-accent-text" : ""}`}>
                    {option.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row, visibleIndex) => {
                const absoluteIndex = (safePage - 1) * PAGE_SIZE + visibleIndex;
                const rank = rankByValue.get(absoluteIndex);
                if (scope === "teams") {
                  const team = row as HackerTeamLeaderboardRow;
                  return (
                    <tr key={team.projectId} className="transition-colors hover:bg-foreground/[0.025]">
                      <td className="px-4 py-4 font-mono text-sm tabular-nums text-muted">{String(rank).padStart(2, "0")}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <LeaderboardAvatar
                            src={team.coverImageUrl}
                            alt={`${team.projectName} project cover`}
                            fallback={team.projectName.slice(0, 2)}
                          />
                          <Link href={`/hackathons/${hackathonSlug}/${team.projectSlug}`} className="font-medium hover:text-accent-text hover:underline">{team.projectName}</Link>
                          {team.isWinner ? <WinnerTrophy track={team.winningTrack} /> : null}
                        </div>
                      </td>
                      {metrics.map((option) => (
                        <td key={option.value} className={`px-4 py-4 text-right font-mono tabular-nums ${metricTone(option.value)} ${metric === option.value ? "text-sm font-semibold" : "text-xs"}`}>
                          {formatMetric(metricValue(team, "teams", option.value), option.value)}
                        </td>
                      ))}
                    </tr>
                  );
                }
                const contributor = row as ContributorAggregate;
                return (
                  <tr key={contributor.githubUserId} className="transition-colors hover:bg-foreground/[0.025]">
                    <td className="px-4 py-4 font-mono text-sm tabular-nums text-muted">{String(rank).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <LeaderboardAvatar
                          src={`https://avatars.githubusercontent.com/u/${contributor.githubUserId}?v=4`}
                          alt={`${contributor.githubLogin} GitHub avatar`}
                          fallback={contributor.githubLogin.slice(0, 2)}
                          round
                          external
                        />
                        <div>
                          <span className="flex items-center gap-1.5">
                            <a href={`https://github.com/${encodeURIComponent(contributor.githubLogin)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-accent-text hover:underline">
                              {contributor.displayName}
                              <ExternalLink size={11} aria-hidden="true" />
                            </a>
                            {contributor.isWinner ? (
                              <WinnerTrophy track={contributor.winningTracks.join(" · ") || null} />
                            ) : null}
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-muted">@{contributor.githubLogin}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted">{contributor.projectName}</td>
                    {metrics.map((option) => (
                      <td key={option.value} className={`px-4 py-4 text-right font-mono tabular-nums ${metricTone(option.value)} ${metric === option.value ? "text-sm font-semibold" : "text-xs"}`}>
                        {formatMetric(metricValue(contributor, "contributors", option.value), option.value)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <div className="px-6 py-14 text-center text-xs text-muted">No leaderboard entries match these settings.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{rows.length} ranked {scope}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="grid size-8 place-items-center border border-border text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35" aria-label="Previous page"><ArrowLeft size={13} /></button>
            <span className="font-mono text-[10px] tabular-nums text-muted">{safePage}/{pageCount}</span>
            <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="grid size-8 place-items-center border border-border text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35" aria-label="Next page"><ArrowRight size={13} /></button>
          </div>
        </div>
      </div>

      <details className="border border-border bg-surface px-4 py-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-foreground">How these leaderboards are calculated</summary>
        <div className="mt-3 max-w-3xl space-y-2 leading-5">
          <p>Team totals count each default-branch commit once. Contributor totals credit the full additions and deletions to every GitHub-resolved primary author and co-author, so contributor totals are not meant to add up to the team total.</p>
          <p>Only commits authored during the official hackathon window are included. GitHub raw totals include merges, generated files, dependencies, and lockfiles.</p>
        </div>
      </details>
    </section>
  );
}
