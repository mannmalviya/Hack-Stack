import { ArrowUpRight, Trophy } from "lucide-react";
import Link from "next/link";
import { ProjectCoverImage } from "@/components/projects/project-cover-image";
import type { ProjectListItem } from "@/lib/data/hackathons";

export function ProjectCard({
  project,
  hackathonSlug,
  index,
  label,
}: {
  project: ProjectListItem;
  hackathonSlug: string;
  index: number;
  /** Replaces the index numeral in the caption, e.g. the hackathon name on the landing grid. */
  label?: string;
}) {
  return (
    <Link
      href={`/hackathons/${hackathonSlug}/${project.slug}`}
      className="group flex h-full flex-col overflow-hidden bg-surface transition-colors duration-200 hover:bg-foreground/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border">
        {project.isWinner && (
          <div
            className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 border border-accent/50 bg-background/95 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-foreground shadow-sm backdrop-blur-sm"
            title={project.winningTrack ?? "Winner"}
          >
            <Trophy size={12} className="shrink-0 text-accent-text" aria-hidden="true" />
            <span className="shrink-0">Winner</span>
            {project.winningTrack && (
              <>
                <span className="text-muted" aria-hidden="true">·</span>
                <span className="truncate text-muted">{project.winningTrack}</span>
              </>
            )}
          </div>
        )}
        {project.coverImageUrl ? (
          <ProjectCoverImage src={project.coverImageUrl} alt={`${project.name} project cover`} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_48%)]">
            <span className="text-3xl font-semibold tracking-[-0.06em] text-accent-text/50" aria-hidden="true">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums text-muted" aria-hidden={label ? undefined : "true"}>
            {label ?? String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.025em] text-foreground">
            {project.name}
          </h2>
        </div>
        <ArrowUpRight
          size={15}
          className="mt-1 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
