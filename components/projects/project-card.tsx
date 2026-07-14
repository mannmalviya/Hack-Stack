import { ArrowUpRight, FileCheck2, GitFork, Globe2 } from "lucide-react";
import Link from "next/link";
import type { Project, VerificationOutcome } from "@/lib/projects";

const outcomeLabels: Record<VerificationOutcome, string> = {
  verified: "Verified",
  code_supported: "Code supported",
  claimed_only: "Claimed only",
  blocked: "Blocked",
};

const outcomeClasses: Record<VerificationOutcome, string> = {
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  code_supported: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  claimed_only: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  blocked: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export function ProjectCard({ project, hackathonSlug }: { project: Project; hackathonSlug: string }) {
  return (
    <Link
      href={`/hackathons/${hackathonSlug}/${project.slug}`}
      className="group relative flex min-h-72 flex-col overflow-hidden border border-border bg-surface p-5 transition-[background-color,border-color,box-shadow] duration-200 hover:border-foreground/25 hover:bg-[#f3f3f3] hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:border-zinc-600 dark:hover:bg-[#1a1a1a] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: project.accent }} />
      <div className="flex items-start justify-between gap-3">
        <span className={`px-2.5 py-1 text-[11px] font-medium ${outcomeClasses[project.outcome]}`}>
          {outcomeLabels[project.outcome]}
        </span>
        <ArrowUpRight className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" size={17} />
      </div>

      <div className="mt-7 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{project.category}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-foreground">{project.name}</h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{project.tagline}</p>
      </div>

      <div className="mt-6 border-t border-dashed border-border pt-4">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><FileCheck2 size={14} />{project.evidenceCount} evidence items</span>
          <span className="ml-auto">{project.language}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-muted">
          {project.hasRepository && <GitFork size={14} aria-label="Repository available" />}
          {project.hasDemo && <Globe2 size={14} aria-label="Public demo available" />}
          <span className="ml-auto text-[11px] opacity-0 transition-opacity group-hover:opacity-100">Open evidence brief</span>
        </div>
      </div>
    </Link>
  );
}
