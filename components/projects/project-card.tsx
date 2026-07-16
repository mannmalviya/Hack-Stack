import { ArrowUpRight, GitFork, Globe2, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/data/hackathons";

export function ProjectCard({ project, hackathonSlug }: { project: ProjectListItem; hackathonSlug: string }) {
  return (
    <Link
      href={`/hackathons/${hackathonSlug}/${project.slug}`}
      className="group relative flex min-h-72 flex-col overflow-hidden border border-border bg-surface transition-[background-color,border-color,box-shadow] duration-200 hover:border-foreground/25 hover:bg-[#f3f3f3] hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:border-zinc-600 dark:hover:bg-[#1a1a1a] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-[#25a993]" />
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-[#e7eceb] dark:bg-[#111817]">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt={`${project.name} project cover`}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(37,169,147,0.24),transparent_48%),linear-gradient(135deg,#eef3f2,#dce6e3)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(37,169,147,0.2),transparent_48%),linear-gradient(135deg,#16201e,#0e1211)]">
            <span className="text-3xl font-semibold tracking-[-0.06em] text-[#238f7d]/55 dark:text-[#65c9b8]/45" aria-hidden="true">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          {project.isWinner ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-50/95 px-2.5 py-1 text-[11px] font-medium text-amber-800 shadow-sm backdrop-blur">
              <Trophy size={12} /> {project.winningTrack ?? "Winner"}
            </span>
          ) : <span className="bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">Devpost submission</span>}
          <span className="grid size-7 place-items-center bg-black/45 text-white backdrop-blur">
            <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={16} />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            {project.builtWith.slice(0, 3).join(" · ") || "Technology not listed"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-foreground">{project.name}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{project.tagline ?? "No project tagline was published."}</p>
        </div>

        <div className="mt-6 border-t border-dashed border-border pt-4">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Users size={14} />{project.teamSize} {project.teamSize === 1 ? "member" : "members"}</span>
            <span className="ml-auto">{project.builtWith.length} technologies</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-muted">
            {project.githubUrl && <GitFork size={14} aria-label="Repository available" />}
            {project.demoUrl && <Globe2 size={14} aria-label="Public demo available" />}
            <span className="ml-auto text-[11px] opacity-0 transition-opacity group-hover:opacity-100">Open submission</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
