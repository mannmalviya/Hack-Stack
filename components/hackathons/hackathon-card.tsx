import { CalendarDays, Database, FolderKanban } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { EventStatus, HackathonListItem, IndexingStatus } from "@/lib/data/hackathons";
import { formatIndexedProjectCount, indexCoverageLabels } from "@/lib/index-coverage";

const statusLabels: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
};

const statusSwatches: Record<EventStatus, string> = {
  upcoming: "border border-foreground/40",
  active: "bg-accent",
  completed: "bg-muted/50",
};

const indexingLabels: Record<IndexingStatus, string> = {
  queued: "Import queued",
  running: "Import in progress",
  succeeded: "Last import succeeded",
  partial: "Last import had issues",
  failed: "Last import failed",
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
            {hackathon.name}
          </h2>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span aria-hidden="true" className={`size-2 ${statusSwatches[hackathon.eventStatus]}`} />
            {statusLabels[hackathon.eventStatus]}
          </span>
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
          <Database size={13} />
          {indexingLabels[hackathon.indexingStatus]}
        </p>
      </div>
    </Link>
  );
}
