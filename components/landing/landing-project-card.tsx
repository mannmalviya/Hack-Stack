import { ArrowUpRight, GitFork, Globe2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedProject } from "@/lib/data/hackathons";

const colors = ["#7dd3fc", "#6ee7b7", "#c4b5fd", "#f9a8d4", "#fde68a", "#fda4af"];
const icons = ["✦", "◎", "◉", "⌁", "✺", "◇"];

export function LandingProjectCard({ project, index }: { project: FeaturedProject; index: number }) {
  const color = colors[index % colors.length];
  return (
    <Link
      href={`/hackathons/${project.hackathonSlug}/${project.slug}`}
      className="group relative flex min-h-72 flex-col overflow-hidden border border-white/12 bg-white/[0.045] backdrop-blur-md transition-[background-color,border-color,transform] duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-[#090b12]">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt={`${project.name} project cover`}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: `radial-gradient(circle at 35% 25%, ${color}30, transparent 50%), #090b12` }}
          >
            <span className="text-3xl" style={{ color }} aria-hidden="true">{icons[index % icons.length]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a]/70 via-transparent to-black/25" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/70">PROJECT {String(index + 1).padStart(2, "0")}</span>
          <span className="grid size-7 place-items-center bg-black/35 text-white/75 backdrop-blur">
            <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" size={17} />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">{project.builtWith.slice(0, 2).join(" · ") || "Devpost project"}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-white">{project.name}</h3>
          <p className="mt-4 text-sm leading-6 text-white/55">{project.tagline ?? "No project tagline was published."}</p>
        </div>

        <div className="mt-5 flex items-center border-t border-dashed border-white/12 pt-4 text-[11px] text-white/45">
          <span className="truncate">{project.hackathonName}</span>
          <span className="ml-auto flex gap-2 pl-3">
            {project.githubUrl && <GitFork size={14} aria-label="GitHub source available" />}
            {project.demoUrl && <Globe2 size={14} aria-label="Public demo available" />}
          </span>
        </div>
      </div>
    </Link>
  );
}
