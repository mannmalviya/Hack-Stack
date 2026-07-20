"use client";

import { MotionConfig } from "motion/react";
import { useState } from "react";
import { AnimatedBar } from "@/components/motion/animated-bar";
import type { ProjectContributor, ProjectTeamStats } from "@/lib/data/project-team";

type View = "members" | "team";
type Metric = "commits" | "additions" | "deletions";

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: "commits", label: "Commits" },
  { id: "additions", label: "+ Lines" },
  { id: "deletions", label: "− Lines" },
];

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "members", label: "Per member" },
  { id: "team", label: "Whole team" },
];

const numberFormat = new Intl.NumberFormat("en-US");

function metricValue(contributor: ProjectContributor, metric: Metric) {
  if (metric === "additions") return contributor.creditedAdditions;
  if (metric === "deletions") return contributor.creditedDeletions;
  return contributor.creditedCommitCount;
}

/** One hue at a time — the metric selector swaps the series, never stacks them. */
function metricBarTone(metric: Metric) {
  if (metric === "additions") return "bg-emerald-500";
  if (metric === "deletions") return "bg-red-500";
  return "bg-accent";
}

// Matches metricTone in hacker-insights.tsx. The +/− prefix still carries the
// meaning on its own, so the colour reinforces rather than encodes it.
function metricTextTone(metric: Metric) {
  if (metric === "additions") return "text-emerald-600 dark:text-emerald-400";
  if (metric === "deletions") return "text-red-600 dark:text-red-400";
  return "text-muted";
}

function formatMetric(value: number, metric: Metric) {
  const formatted = numberFormat.format(value);
  if (metric === "additions") return `+${formatted}`;
  if (metric === "deletions") return `−${formatted}`;
  return formatted;
}

function Notice({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warning" }) {
  const className = tone === "warning"
    ? "border border-amber-400/40 bg-amber-400/[0.07] px-4 py-6 text-center text-xs text-amber-700 dark:text-amber-400"
    : "border border-dashed border-border px-4 py-8 text-center text-xs text-muted";
  return <p className={className}>{children}</p>;
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="flex border border-border p-0.5">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                selected ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-surface px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-[-0.045em] ${tone ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function ContributorBars({
  contributors,
  metric,
}: {
  contributors: ProjectContributor[];
  metric: Metric;
}) {
  // Floor of 1 keeps a single all-zero row from dividing by zero.
  const maximum = Math.max(1, ...contributors.map((c) => metricValue(c, metric)));
  // Re-rank on every metric switch: the top committer is rarely the top by lines.
  const ranked = [...contributors].sort(
    (left, right) => metricValue(right, metric) - metricValue(left, metric),
  );

  return (
    <MotionConfig reducedMotion="user">
      <ul className="space-y-3">
        {ranked.map((contributor, index) => {
          const value = metricValue(contributor, metric);
          const percent = value > 0 ? Math.max((value / maximum) * 100, 1) : 0;
          return (
            <li
              key={contributor.githubUserId}
              className="grid gap-2 sm:grid-cols-[minmax(8rem,13rem)_1fr_5rem] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://avatars.githubusercontent.com/u/${contributor.githubUserId}?v=4`}
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  className="size-5 shrink-0 rounded-full bg-foreground/10"
                />
                <a
                  href={`https://github.com/${contributor.githubLogin}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`@${contributor.githubLogin}`}
                  className="truncate text-sm hover:text-accent-text hover:underline"
                >
                  {contributor.displayName}
                </a>
              </div>
              <div
                className="h-2 overflow-hidden bg-foreground/[0.06]"
                role="img"
                aria-label={`${contributor.displayName}: ${formatMetric(value, metric)}`}
              >
                {percent > 0 ? (
                  <AnimatedBar
                    percent={percent}
                    delay={Math.min(index * 0.04, 0.3)}
                    className={metricBarTone(metric)}
                  />
                ) : null}
              </div>
              <span
                className={`text-right font-mono text-[11px] tabular-nums ${metricTextTone(metric)}`}
              >
                {formatMetric(value, metric)}
              </span>
            </li>
          );
        })}
      </ul>
    </MotionConfig>
  );
}

export function TeamStats({
  stats,
  evidence,
}: {
  stats: ProjectTeamStats;
  /** Rendered beneath the stats in every state; it has its own data source. */
  evidence?: React.ReactNode;
}) {
  const [view, setView] = useState<View>("members");
  const [metric, setMetric] = useState<Metric>("commits");

  if (stats.state !== "ready") {
    const notice = stats.state === "waiting"
      ? <Notice>Team stats are calculated when this hackathon is indexed.</Notice>
      : stats.state === "calculating"
        ? <Notice>Team stats are still being calculated for this hackathon.</Notice>
        : stats.state === "failed"
          ? <Notice tone="warning">{stats.error}</Notice>
          : (
            <Notice>
              No indexed repository for this project, so there are no commit stats to show.
            </Notice>
          );
    return (
      <div className="space-y-6 p-5">
        {notice}
        {evidence}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-wrap items-end gap-6">
        <SegmentedControl label="View" options={VIEWS} value={view} onChange={setView} />
        {view === "members" ? (
          <SegmentedControl
            label="Metric"
            options={METRICS}
            value={metric}
            onChange={setMetric}
          />
        ) : null}
      </div>

      {view === "team" ? (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
          <StatTile label="Commits" value={numberFormat.format(stats.team.commitCount)} />
          <StatTile
            label="Lines added"
            value={`+${numberFormat.format(stats.team.additions)}`}
            tone={metricTextTone("additions")}
          />
          <StatTile
            label="Lines deleted"
            value={`−${numberFormat.format(stats.team.deletions)}`}
            tone={metricTextTone("deletions")}
          />
        </div>
      ) : stats.contributors.length === 0 ? (
        <Notice>No commits on this project resolved to a GitHub account.</Notice>
      ) : (
        <>
          <ContributorBars contributors={stats.contributors} metric={metric} />
          {/* Judges compare these numbers, so the crediting rule has to be stated:
              co-authored commits count in full for every author. */}
          <p className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted">
            Figures cover GitHub contributors during the hackathon window. A co-authored
            commit counts in full for each author, so per-member totals add up to more
            than the whole-team figures.
          </p>
        </>
      )}

      {evidence}
    </div>
  );
}
