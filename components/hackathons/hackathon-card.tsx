import { CalendarDays, FolderKanban, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import type { Hackathon, HackathonStatus } from "@/lib/hackathons";

const statusLabels: Record<HackathonStatus, string> = {
  open: "Open",
  judging: "In judging",
  completed: "Completed",
};

const statusClasses: Record<HackathonStatus, string> = {
  open: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  judging: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateRange(startsAt: string, endsAt: string) {
  return `${dateFormatter.format(new Date(startsAt))} – ${dateFormatter.format(new Date(endsAt))}`;
}

function formatLocation(location: Hackathon["location"]) {
  if (location === "in-person") return "In person";
  return location[0].toUpperCase() + location.slice(1);
}

export function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  return (
    <Link
      href={`/hackathons/${hackathon.slug}`}
      className="group grid border border-border border-l-[3px] border-l-[#25a993] bg-surface transition-colors duration-200 hover:bg-[#f1f1f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25a993]/40 dark:hover:bg-[#1a1a1a] md:grid-cols-[150px_minmax(0,1fr)_220px]"
    >
      <div className="flex items-center justify-center border-b border-border p-5 md:border-r md:border-b-0">
        <div
          className="grid aspect-square w-full max-w-24 place-items-center text-xl font-bold tracking-[-0.04em] text-white shadow-sm"
          style={{ backgroundColor: hackathon.accent }}
          aria-hidden="true"
        >
          {hackathon.initials}
        </div>
      </div>

      <div className="min-w-0 p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
            {hackathon.name}
          </h2>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClasses[hackathon.status]}`}>
            {statusLabels[hackathon.status]}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{hackathon.description}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-1.5"><MapPin size={14} />{formatLocation(hackathon.location)}</span>
          <span className="flex items-center gap-1.5"><FolderKanban size={14} />{hackathon.projectCount} projects</span>
        </div>
      </div>

      <div className="flex flex-col border-t border-border p-5 md:border-t-0 md:border-l">
        <p className="text-xs font-medium text-foreground">{hackathon.organizer}</p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <CalendarDays className="mt-0.5 shrink-0" size={14} />
          {formatDateRange(hackathon.startsAt, hackathon.endsAt)}
        </p>
        <div className="mt-4 flex items-start gap-2">
          <Tag className="mt-1 shrink-0 text-muted" size={14} />
          <div className="flex flex-wrap gap-1.5">
            {hackathon.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-blue-500/8 px-2 py-1 text-[11px] text-blue-700 dark:text-blue-300">{tag}</span>
            ))}
          </div>
        </div>
      </div>

    </Link>
  );
}
