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

const statusClasses: Record<EventStatus, string> = {
  upcoming: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  completed: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
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

export function HackathonCard({ hackathon }: { hackathon: HackathonListItem }) {
  const initials = hackathon.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <Link
      href={`/hackathons/${hackathon.slug}`}
      className="group grid border border-border border-l-[3px] border-l-[#25a993] bg-surface transition-colors duration-200 hover:bg-[#f1f1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25a993]/40 dark:hover:bg-[#1a1a1a] md:grid-cols-[150px_minmax(0,1fr)_220px]"
    >
      <div className="flex items-center justify-center border-b border-border p-5 md:border-r md:border-b-0">
        <div
          className="relative grid aspect-square w-full max-w-24 place-items-center overflow-hidden text-xl font-bold tracking-[-0.04em] text-white shadow-sm"
          style={{ backgroundColor: "#25a993" }}
        >
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
      </div>

      <div className="min-w-0 p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
            {hackathon.name}
          </h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClasses[hackathon.eventStatus]}`}>
            {statusLabels[hackathon.eventStatus]}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <FolderKanban size={14} />
            {formatIndexedProjectCount(
              hackathon.indexedProjectCount,
              hackathon.availableProjectCount,
            )}
          </span>
          <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 font-medium text-foreground">
            {indexCoverageLabels[hackathon.indexCoverage]}
          </span>
        </div>
      </div>

      <div className="flex flex-col border-t border-border p-5 md:border-t-0 md:border-l">
        <p className="text-xs font-medium text-foreground">{hackathon.organizer ?? "Organizer unavailable"}</p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <CalendarDays className="mt-0.5 shrink-0" size={14} />
          {formatDateRange(hackathon.startsAt, hackathon.endsAt)}
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Database size={14} />
          {indexingLabels[hackathon.indexingStatus]}
        </div>
      </div>

    </Link>
  );
}
