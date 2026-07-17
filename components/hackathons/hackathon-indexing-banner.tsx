"use client";

import { Database, FolderKanban, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { HackathonListItem, IndexingStage } from "@/lib/data/hackathons";
import { formatIndexedProjectCount } from "@/lib/index-coverage";

const stageDetails: Record<IndexingStage, { label: string; unit: string; description: string }> = {
  discovering_projects: {
    label: "Discovering projects",
    unit: "project listings",
    description: "Scanning the Devpost gallery to find every submitted project.",
  },
  scraping_projects: {
    label: "Scraping project details",
    unit: "projects",
    description: "Saving project metadata, links, technologies, and cover images.",
  },
  ingesting_repositories: {
    label: "Ingesting GitHub repositories",
    unit: "repositories",
    description: "Indexing repository files, commits, dependencies, and language data.",
  },
};

export function HackathonIndexingBanner({ hackathon }: { hackathon: HackathonListItem }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const isRunning = hackathon.indexingStatus === "running";

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isRefreshing) return;
      startRefresh(() => router.refresh());
    }, isRunning ? 2000 : 10000);

    return () => window.clearInterval(refreshInterval);
  }, [isRefreshing, isRunning, router]);

  if (!isRunning) return null;

  const stage = hackathon.indexingStage
    ? stageDetails[hackathon.indexingStage]
    : {
        label: "Indexing hackathon",
        unit: "items",
        description: "Preparing the hackathon data for analysis.",
      };
  const total = hackathon.indexingProgressTotal;
  const completed = Math.min(hackathon.indexingProgressCompleted, total ?? Infinity);
  const percentage = total && total > 0
    ? Math.min(100, Math.round((completed / total) * 100))
    : null;
  const remaining = total === null ? null : Math.max(total - completed, 0);

  return (
    <section
      aria-labelledby="indexing-progress-title"
      aria-live="polite"
      className="relative overflow-hidden border border-accent/40 bg-accent/[0.06] px-5 py-5 shadow-[inset_3px_0_0_var(--color-accent)] sm:px-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <LoaderCircle className="mt-0.5 shrink-0 animate-spin text-accent-text" size={20} aria-hidden="true" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">
              Hackathon indexing in progress
            </p>
            <h2 id="indexing-progress-title" className="mt-1 text-lg font-semibold tracking-[-0.025em]">
              {stage.label}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{stage.description}</p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {percentage === null ? "Working" : `${percentage}%`}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {total === null ? `${completed} completed` : `${completed} of ${total} complete`}
          </p>
        </div>
      </div>

      <div
        className="mt-5 h-2 overflow-hidden bg-border"
        role="progressbar"
        aria-label={stage.label}
        aria-valuemin={0}
        aria-valuemax={total ?? undefined}
        aria-valuenow={total === null ? undefined : completed}
        aria-valuetext={total === null ? `${completed} completed` : `${completed} of ${total} complete`}
      >
        <div
          className={`h-full bg-accent transition-[width] duration-500 ${percentage === null ? "w-1/3 animate-pulse" : ""}`}
          style={percentage === null ? undefined : { width: `${percentage}%` }}
        />
      </div>

      <div className="mt-4 grid gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:grid-cols-3">
        <span className="flex items-center gap-2">
          <Database size={12} aria-hidden="true" />
          {remaining === null ? "Total still being determined" : `${remaining} ${stage.unit} remaining`}
        </span>
        <span className="flex items-center gap-2">
          <FolderKanban size={12} aria-hidden="true" />
          {formatIndexedProjectCount(
            hackathon.indexedProjectCount,
            hackathon.availableProjectCount,
          )}
        </span>
        <span className="flex items-center gap-2 sm:justify-end">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          Updates automatically
        </span>
      </div>
    </section>
  );
}
