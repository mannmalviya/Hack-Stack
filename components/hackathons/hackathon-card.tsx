import { CalendarDays, Database, FolderKanban, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HackathonStageProgress } from "@/components/hackathons/hackathon-stage-progress";
import type {
  HackathonListItem,
  IndexingStage,
  IndexingStatus,
} from "@/lib/data/hackathons";
import { formatIndexedProjectCount, indexCoverageLabels } from "@/lib/index-coverage";

const indexingLabels: Record<IndexingStatus, string> = {
  queued: "Import queued",
  running: "Import in progress",
  succeeded: "Last import succeeded",
  partial: "Last import had issues",
  failed: "Last import failed",
};

const stageLabels: Record<IndexingStage, string> = {
  discovering_projects: "Discovering projects",
  scraping_projects: "Scraping projects",
  ingesting_repositories: "Ingesting GitHub repositories",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "Dates unavailable";
  if (!startsAt) return `Ends ${dateFormatter.format(new Date(endsAt!))}`;
  if (!endsAt) return `Starts ${dateFormatter.format(new Date(startsAt))}`;
  return `${dateFormatter.format(new Date(startsAt))} – ${dateFormatter.format(new Date(endsAt))}`;
}

export function HackathonCard({ hackathon, index }: { hackathon: HackathonListItem; index: number }) {
  const initials = hackathon.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const isRunning = hackathon.indexingStatus === "running";
  const progress = hackathon.indexingProgressTotal !== null
    ? `${hackathon.indexingProgressCompleted}/${hackathon.indexingProgressTotal}`
    : hackathon.indexingProgressCompleted > 0
      ? String(hackathon.indexingProgressCompleted)
      : null;
  const runningLabel = hackathon.indexingStage
    ? stageLabels[hackathon.indexingStage]
    : "Indexing hackathon";
  const settledLabel = hackathon.isFullyIndexed
    ? "Completed"
    : hackathon.indexingStatus === "queued"
      ? "Queued"
      : hackathon.indexingStatus === "failed"
        ? "Failed"
        : "Incomplete";
  const indexingSummary = isRunning
    ? `${runningLabel}${progress ? ` ${progress}` : ""}`
    : hackathon.isFullyIndexed
      ? "All public projects and repositories indexed"
      : hackathon.indexCoverage !== "complete"
        ? "Full project coverage not yet indexed"
        : indexingLabels[hackathon.indexingStatus];
  return (
    <Link
      href={`/hackathons/${hackathon.slug}`}
      className="group relative grid gap-4 py-6 pr-2 pl-5 transition-colors duration-200 hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:grid-cols-[3rem_96px_minmax(0,1fr)_220px] md:items-center md:gap-6"
    >
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-0.5 origin-top scale-y-0 bg-accent transition-transform duration-200 group-hover:scale-y-100"
      />
      <span aria-hidden="true" className="hidden font-mono text-lg tabular-nums text-muted/60 md:block">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative hidden aspect-square w-24 shrink-0 place-items-center overflow-hidden bg-accent text-xl font-bold tracking-[-0.04em] text-white md:grid">
        {hackathon.coverImageUrl ? (
          <Image
            src={hackathon.coverImageUrl}
            alt={`${hackathon.name} cover`}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
          {hackathon.name}
        </h2>
        <div className="mt-2 min-h-4">
          {isRunning ? (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-text"
              aria-live="polite"
            >
              <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
              {runningLabel}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
              hackathon.isFullyIndexed ? "text-accent-text" : "text-muted"
            }`}>
              <span
                aria-hidden="true"
                className={`size-2 ${hackathon.isFullyIndexed ? "bg-accent" : "bg-muted/50"}`}
              />
              {settledLabel}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-muted">
          <span className="flex items-center gap-1.5 tabular-nums">
            <FolderKanban size={13} />
            {formatIndexedProjectCount(
              hackathon.indexedProjectCount,
              hackathon.availableProjectCount,
            )}
          </span>
          <span className="uppercase tracking-[0.1em]">
            {indexCoverageLabels[hackathon.indexCoverage]}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 md:border-l md:border-border md:pl-6">
        <p className="text-xs font-medium text-foreground">{hackathon.organizer ?? "Organizer unavailable"}</p>
        <p className="flex items-start gap-2 font-mono text-[11px] leading-5 tabular-nums text-muted">
          <CalendarDays className="mt-0.5 shrink-0" size={13} />
          {formatDateRange(hackathon.startsAt, hackathon.endsAt)}
        </p>
        <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
          {isRunning ? (
            <HackathonStageProgress
              stage={hackathon.indexingStage}
              completed={hackathon.indexingProgressCompleted}
              total={hackathon.indexingProgressTotal}
            />
          ) : (
            <Database size={13} className="shrink-0" />
          )}
          {isRunning && hackathon.indexingProgressTotal !== null
            ? `${Math.max(
                hackathon.indexingProgressTotal - hackathon.indexingProgressCompleted,
                0,
              )} ${hackathon.indexingStage === "ingesting_repositories" ? "repositories" : "projects"} remaining`
            : indexingSummary}
        </p>
      </div>
    </Link>
  );
}
