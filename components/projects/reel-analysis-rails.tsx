"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { LoadReelAnalysisResult } from "@/app/(workspace)/hackathons/[slug]/[projects]/actions";
import { AgentLogo } from "@/components/icons/agent-logos";
import { TechnologyIcon } from "@/components/icons/technology-icon";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { DUR, EASE_OUT } from "@/components/motion/tokens";
import { formatBytes } from "@/lib/format";
import type { ProjectReelItem } from "@/lib/data/project-reels";
import type { ReelAnalysis, ReelFeatureCheck } from "@/lib/data/reel-analysis";

// Per-outcome presentation for the feature check, mirroring the project page's
// FeatureVerificationPanel but with tighter labels for the narrow rail.
const FEATURE_OUTCOME: Record<
  ReelFeatureCheck["outcome"],
  { label: string; dot: string; text: string }
> = {
  verified: {
    label: "Verified",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  code_supported: { label: "Supported", dot: "bg-accent", text: "text-accent-text" },
  claimed_only: {
    label: "Claimed",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  blocked: { label: "Blocked", dot: "bg-foreground/30", text: "text-muted" },
};

/** How many features show before the list collapses behind a count breakdown. */
const FEATURES_COLLAPSED = 5;

export type LoadReelAnalysis = (input: {
  hackathonSlug: string;
  projectSlug: string;
}) => Promise<LoadReelAnalysisResult>;

type AnalysisEntry =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; analysis: ReelAnalysis | null };

// Same hatch the evidence list uses for a claim with no code behind it.
const CLAIMED_STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--background) 3px, var(--background) 5px)";

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Fetches the active card's analysis once and keeps every fetched project
 * cached, so stepping back through the feed never refetches.
 */
function useReelAnalysis(item: ProjectReelItem | null, loadAnalysis: LoadReelAnalysis) {
  const [entries, setEntries] = useState<Record<string, AnalysisEntry>>({});
  // Refs, not state: fetch bookkeeping must not re-run the effect or re-render.
  const requestedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!item) return;
    const key = item.id;
    if (requestedIds.current.has(key)) return;
    requestedIds.current.add(key);
    loadAnalysis({ hackathonSlug: item.hackathonSlug, projectSlug: item.slug })
      .then((result) => {
        setEntries((current) => ({
          ...current,
          [key]:
            result.outcome === "success"
              ? { status: "ready", analysis: result.analysis }
              : { status: "error" },
        }));
      })
      .catch(() => {
        setEntries((current) => ({ ...current, [key]: { status: "error" } }));
      });
  }, [item, loadAnalysis]);

  if (!item) return null;
  return entries[item.id] ?? ({ status: "loading" } as const);
}

function RailPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface shadow-lg">
      <h3 className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </h3>
      {children}
    </section>
  );
}

function RailNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border px-3 py-5 text-center text-[11px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

function RailSkeleton({ label, rows }: { label: string; rows: number }) {
  return (
    <RailPanel label={label}>
      <div aria-hidden="true" className="space-y-2.5 p-3.5">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="h-2.5 animate-pulse bg-foreground/[0.07]"
            style={{ width: `${88 - index * 16}%` }}
          />
        ))}
      </div>
    </RailPanel>
  );
}

/** Fades a rail's content in when the active project changes. */
function RailReveal({ id, children }: { id: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={id}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast * 1.5, ease: EASE_OUT }}
      className="space-y-3"
    >
      {children}
    </motion.div>
  );
}

function TeamCard({ analysis }: { analysis: ReelAnalysis }) {
  if (analysis.team.state !== "ready") {
    return (
      <RailPanel label="Team">
        <div className="p-3.5">
          <RailNote>No commit stats for this project yet.</RailNote>
        </div>
      </RailPanel>
    );
  }

  const { team } = analysis;
  const maximum = Math.max(1, ...team.contributors.map((c) => c.commitCount));

  return (
    <RailPanel label="Team">
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="min-w-0 px-3.5 py-3">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Commits
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em]">
            {compactFormat.format(team.commitCount)}
          </p>
        </div>
        <div className="min-w-0 px-3.5 py-3">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            + Lines
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-emerald-600 dark:text-emerald-400">
            {compactFormat.format(team.additions)}
          </p>
        </div>
        <div className="min-w-0 px-3.5 py-3">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            − Lines
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-red-600 dark:text-red-400">
            {compactFormat.format(team.deletions)}
          </p>
        </div>
      </div>

      {team.contributors.length > 0 ? (
        <ul className="divide-y divide-border">
          {team.contributors.map((contributor, index) => (
            <li key={contributor.githubUserId} className="flex items-center gap-2.5 px-4 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://avatars.githubusercontent.com/u/${contributor.githubUserId}?v=4`}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                className="size-5 shrink-0 rounded-full bg-foreground/10"
              />
              <span
                title={`@${contributor.githubLogin}`}
                className="w-24 shrink-0 truncate text-[13px]"
              >
                {contributor.displayName}
              </span>
              <div className="h-2 flex-1 bg-foreground/[0.06]">
                <AnimatedBar
                  percent={(contributor.commitCount / maximum) * 100}
                  delay={Math.min(index * 0.06, 0.25)}
                  className="bg-accent"
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
                {numberFormat.format(contributor.commitCount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4">
          <RailNote>No commits resolved to a GitHub account.</RailNote>
        </div>
      )}

      {team.hiddenContributorCount > 0 ? (
        <p className="border-t border-border px-4 py-2 font-mono text-[10px] text-muted">
          +{team.hiddenContributorCount} more contributor
          {team.hiddenContributorCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </RailPanel>
  );
}

/** A muted uppercase heading for a subsection inside the Tech stack box. */
function StackSubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{children}</p>
  );
}

/**
 * One box holding the whole stack: languages, libraries, the per-technology
 * claim check, and the AI coding agents beneath it.
 */
function StackCard({ analysis }: { analysis: ReelAnalysis }) {
  const { technologies, hasIndexedRepository } = analysis;
  const hasAnything =
    analysis.languages.length > 0 ||
    analysis.packages.top.length > 0 ||
    analysis.agents.length > 0 ||
    technologies.totalCount > 0;

  if (!hasAnything) {
    return (
      <RailPanel label="Tech stack">
        <div className="p-3.5">
          <RailNote>No indexed repository to read a stack from.</RailNote>
        </div>
      </RailPanel>
    );
  }

  return (
    <RailPanel label="Tech stack">
      {analysis.languages.length > 0 ? (
        <div className="p-4">
          <StackSubLabel>Languages</StackSubLabel>
          <div className="mt-2.5 space-y-2.5">
            {analysis.languages.map((language, index) => (
              <div key={language.name} className="flex items-center gap-2.5">
                <span className="flex w-28 shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted">
                  <TechnologyIcon name={language.name} className="size-3.5 shrink-0" />
                  <span className="truncate">{language.name}</span>
                </span>
                <div className="h-2 flex-1 bg-foreground/[0.06]">
                  <AnimatedBar
                    percent={language.share}
                    delay={Math.min(index * 0.06, 0.25)}
                    className="bg-accent"
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
                  {Math.round(language.share)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.packages.top.length > 0 ? (
        <div className="border-t border-border p-4">
          <StackSubLabel>Libraries</StackSubLabel>
          <div className="mt-2 flex flex-wrap gap-1">
            {analysis.packages.top.map((name) => (
              <span
                key={name}
                className="max-w-full truncate border border-border px-2 py-1 font-mono text-[10px] text-muted"
              >
                {name}
              </span>
            ))}
            {analysis.packages.totalCount > analysis.packages.top.length ? (
              <span className="px-1 py-1 font-mono text-[10px] text-muted">
                +{analysis.packages.totalCount - analysis.packages.top.length}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {technologies.totalCount > 0 ? (
        <div className="border-t border-border">
          <div className="px-4 pt-4">
            <StackSubLabel>Technologies</StackSubLabel>
          </div>
          <ul className="mt-2.5 divide-y divide-border border-t border-border">
            {technologies.items.map((technology) => {
              const detected = technology.evidence === "detected";
              return (
                <li key={technology.name} className="flex items-center gap-2.5 px-4 py-2">
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 ${detected ? "bg-accent" : "bg-foreground/25"}`}
                    style={detected ? undefined : { backgroundImage: CLAIMED_STRIPES }}
                  />
                  <TechnologyIcon name={technology.name} className="size-3.5 shrink-0" />
                  <span className="truncate text-[13px]">{technology.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {detected ? "In code" : hasIndexedRepository ? "Claimed" : "Unchecked"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border px-4 py-2.5 font-mono text-[10px] text-muted">
            {hasIndexedRepository
              ? `${technologies.detectedCount} of ${technologies.totalCount} found in code`
              : "Repo not indexed — claims unchecked"}
            {technologies.hiddenCount > 0 ? ` · +${technologies.hiddenCount} more` : ""}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
        {analysis.agents.length > 0 ? (
          <span className="flex items-center gap-1.5" title={analysis.agents.join(", ")}>
            <StackSubLabel>Agents</StackSubLabel>
            {analysis.agents.map((agent) => (
              <AgentLogo key={agent} agent={agent} className="size-4 shrink-0 text-accent" />
            ))}
          </span>
        ) : (
          <StackSubLabel>No agent signals</StackSubLabel>
        )}
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
          {formatBytes(analysis.codebase.sizeBytes)} · {numberFormat.format(analysis.codebase.fileCount)} files
        </span>
      </div>
    </RailPanel>
  );
}

/** Tiny per-outcome tally row, e.g. "3 ● 2 ●" — used in the collapsed footer. */
function FeatureCountBreakdown({
  counts,
  withLabels,
}: {
  counts: NonNullable<ReelAnalysis["features"]>["counts"];
  withLabels?: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em]">
      {counts.map(({ outcome, count }) => (
        <span key={outcome} className={`flex items-center gap-1 ${FEATURE_OUTCOME[outcome].text}`}>
          <span aria-hidden="true" className={`size-1.5 shrink-0 ${FEATURE_OUTCOME[outcome].dot}`} />
          {count}
          {withLabels ? ` ${FEATURE_OUTCOME[outcome].label}` : ""}
        </span>
      ))}
    </span>
  );
}

/**
 * The AI agent's per-feature verdicts: feature name + outcome. Collapses to the
 * top few with a count breakdown when a project claims many features.
 */
function FeatureCheckCard({ features }: { features: NonNullable<ReelAnalysis["features"]> }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = features.items.length > FEATURES_COLLAPSED;
  const shown = expanded ? features.items : features.items.slice(0, FEATURES_COLLAPSED);

  return (
    <RailPanel label="Feature check">
      <ul className="divide-y divide-border">
        {shown.map((feature) => {
          const config = FEATURE_OUTCOME[feature.outcome];
          return (
            <li key={feature.name} className="flex items-center gap-2.5 px-4 py-2">
              <span aria-hidden="true" className={`size-2 shrink-0 ${config.dot}`} />
              <span className="truncate text-[13px]">{feature.name}</span>
              <span
                className={`ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] ${config.text}`}
              >
                {config.label}
              </span>
            </li>
          );
        })}
      </ul>

      {overflow ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
        >
          <FeatureCountBreakdown counts={features.counts} />
          <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {expanded ? "Show less" : `+${features.items.length - FEATURES_COLLAPSED} more`}
            <ChevronDown
              size={12}
              aria-hidden="true"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      ) : (
        <p className="border-t border-border px-4 py-2.5">
          <FeatureCountBreakdown counts={features.counts} withLabels />
        </p>
      )}
    </RailPanel>
  );
}

function RailBody({
  entry,
  side,
}: {
  entry: AnalysisEntry;
  side: "team" | "stack";
}) {
  if (entry.status === "loading") {
    return side === "team" ? (
      <RailSkeleton label="Team" rows={4} />
    ) : (
      <RailSkeleton label="Tech stack" rows={5} />
    );
  }
  if (entry.status === "error") {
    return <RailNote>Couldn&apos;t load this project&apos;s analysis.</RailNote>;
  }
  if (!entry.analysis) {
    return <RailNote>No analysis for this project.</RailNote>;
  }
  // Feature check rides under Team on the left; the right rail is stack-only.
  return side === "team" ? (
    <>
      <TeamCard analysis={entry.analysis} />
      {entry.analysis.features ? <FeatureCheckCard features={entry.analysis.features} /> : null}
    </>
  ) : (
    <StackCard analysis={entry.analysis} />
  );
}

/**
 * Wraps a reel feed with two analysis rails on wide screens: the active
 * project's team stats — plus the AI feature check when one exists — on the
 * left, and its tech stack on the right. The project page's Analysis section
 * at a glance.
 */
export function ReelAnalysisRails({
  item,
  loadAnalysis,
  children,
}: {
  item: ProjectReelItem | null;
  loadAnalysis: LoadReelAnalysis;
  children: React.ReactNode;
}) {
  const entry = useReelAnalysis(item, loadAnalysis);

  // The feed keeps the full width — its scrollbar stays on the viewport edge —
  // and the rails float over the side space. The custom breakpoints are where
  // a rail plus its offset fits beside the centred max-w-3xl card.
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {children}

      <aside
        aria-label="Team analytics and feature check for the current project"
        className="absolute left-16 top-1/2 hidden max-h-[calc(100%-2rem)] w-72 -translate-y-1/2 overflow-y-auto [scrollbar-width:none] min-[1480px]:block min-[1680px]:w-96 [&::-webkit-scrollbar]:hidden"
      >
        {item && entry ? (
          <RailReveal id={item.id}>
            <RailBody entry={entry} side="team" />
          </RailReveal>
        ) : null}
      </aside>

      <aside
        aria-label="Tech stack for the current project"
        className="absolute right-16 top-1/2 hidden max-h-[calc(100%-2rem)] w-72 -translate-y-1/2 overflow-y-auto [scrollbar-width:none] min-[1480px]:block min-[1680px]:w-96 [&::-webkit-scrollbar]:hidden"
      >
        {item && entry ? (
          <RailReveal id={item.id}>
            <RailBody entry={entry} side="stack" />
          </RailReveal>
        ) : null}
      </aside>
    </div>
  );
}
