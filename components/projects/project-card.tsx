import { ArrowUpRight, Trophy } from "lucide-react";
import Link from "next/link";
import { AgentLogo } from "@/components/icons/agent-logos";
import { ProjectCoverImage } from "@/components/projects/project-cover-image";
import { SourceLink } from "@/components/projects/source-link";
import type {
  ProjectCardContributor,
  ProjectListItem,
} from "@/lib/data/hackathons";
import type { AiCodeAgent } from "@/lib/insights/hackathon-analytics";

const VISIBLE_CONTRIBUTORS = 4;

type QuickAccess = {
  contributors: ProjectCardContributor[];
  agentSignals: AiCodeAgent[];
};

export function ProjectCard({
  project,
  hackathonSlug,
  index,
  label,
  quickAccess,
}: {
  project: ProjectListItem;
  hackathonSlug: string;
  index: number;
  /** Replaces the index numeral in the caption, e.g. the hackathon name on the landing grid. */
  label?: string;
  /** Hackathon-grid-only shortcuts backed by the latest successful analysis snapshot. */
  quickAccess?: QuickAccess;
}) {
  const visibleContributors = quickAccess?.contributors.slice(0, VISIBLE_CONTRIBUTORS) ?? [];
  const hiddenContributorCount = Math.max(
    0,
    (quickAccess?.contributors.length ?? 0) - VISIBLE_CONTRIBUTORS,
  );

  return (
    <article className="group relative flex h-full flex-col overflow-hidden bg-surface transition-colors duration-200 hover:bg-foreground/[0.02]">
      <Link
        href={`/hackathons/${hackathonSlug}/${project.slug}`}
        aria-label={`Open ${project.name} in HackStack`}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      />
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border">
        {project.isWinner && (
          <div
            className="pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 border border-accent/50 bg-background/95 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-foreground shadow-sm backdrop-blur-sm"
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

      <div className="pointer-events-none relative z-20 flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
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

        {quickAccess ? (
          <div className="pointer-events-auto relative z-30 mt-4 flex min-h-7 items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex min-w-0 items-center -space-x-1.5">
              {visibleContributors.map((contributor) => (
                <a
                  key={contributor.githubUserId}
                  href={`https://github.com/${encodeURIComponent(contributor.githubLogin)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${contributor.displayName}'s GitHub profile`}
                  title={`${contributor.displayName} (@${contributor.githubLogin}) · ${contributor.creditedCommitCount} commits`}
                  className="relative inline-flex size-7 shrink-0 overflow-hidden rounded-full border-2 border-surface bg-foreground/[0.07] transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {/* GitHub's avatar CDN serves an already optimized image at this size. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://avatars.githubusercontent.com/u/${contributor.githubUserId}?v=4`}
                    alt={`${contributor.displayName} GitHub avatar`}
                    width={28}
                    height={28}
                    className="size-full object-cover"
                  />
                </a>
              ))}
              {hiddenContributorCount > 0 ? (
                <span
                  className="relative inline-grid size-7 shrink-0 place-items-center rounded-full border-2 border-surface bg-foreground/[0.08] font-mono text-[9px] font-semibold tabular-nums text-muted"
                  title={`${hiddenContributorCount} more contributors`}
                  aria-label={`${hiddenContributorCount} more contributors`}
                >
                  +{hiddenContributorCount}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {quickAccess.agentSignals.map((agent) => (
                <span
                  key={agent}
                  role="img"
                  aria-label={`${agent} signal detected`}
                  title={`${agent} signal detected`}
                  className="inline-flex text-muted"
                >
                  <AgentLogo agent={agent} className="size-4" />
                </span>
              ))}
              <SourceLink source="devpost" href={project.devpostUrl} size={17} />
              {project.githubUrl ? (
                <SourceLink source="github" href={project.githubUrl} size={17} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
