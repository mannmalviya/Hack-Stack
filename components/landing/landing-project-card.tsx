import { ArrowUpRight, GitFork, Globe2 } from "lucide-react";
import Link from "next/link";

export type LandingProject = {
  name: string;
  tagline: string;
  hackathon: string;
  hackathonSlug: string;
  projectSlug: string;
  category: string;
  color: string;
  icon: string;
  sources: ("demo" | "github")[];
};

export function LandingProjectCard({ project, index }: { project: LandingProject; index: number }) {
  return (
    <Link
      href={`/hackathons/${project.hackathonSlug}/${project.projectSlug}`}
      className="group relative flex min-h-72 flex-col overflow-hidden border border-white/12 bg-white/[0.045] p-6 backdrop-blur-md transition-[background-color,border-color,transform] duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${project.color}, transparent)` }}
      />
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/35">PROJECT {String(index + 1).padStart(2, "0")}</span>
        <ArrowUpRight className="text-white/40 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" size={18} />
      </div>

      <div className="my-8 flex flex-1 items-center gap-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-full border text-xl shadow-[0_0_36px_rgba(255,255,255,0.08)]"
          style={{ borderColor: `${project.color}80`, backgroundColor: `${project.color}18`, color: project.color }}
          aria-hidden="true"
        >
          {project.icon}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">{project.category}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-white">{project.name}</h3>
        </div>
      </div>

      <p className="text-sm leading-6 text-white/55">{project.tagline}</p>
      <div className="mt-5 flex items-center border-t border-dashed border-white/12 pt-4 text-[11px] text-white/45">
        <span className="truncate">{project.hackathon}</span>
        <span className="ml-auto flex gap-2 pl-3">
          {project.sources.includes("github") && <GitFork size={14} aria-label="GitHub source available" />}
          {project.sources.includes("demo") && <Globe2 size={14} aria-label="Public demo available" />}
        </span>
      </div>
    </Link>
  );
}
