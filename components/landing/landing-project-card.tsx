import Image from "next/image";
import Link from "next/link";
import type { FeaturedProject } from "@/lib/data/hackathons";

export function LandingProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <Link
      href={`/hackathons/${project.hackathonSlug}/${project.slug}`}
      className="group overflow-hidden border border-white/12 bg-white/[0.045] backdrop-blur-md transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
    >
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
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_35%_25%,rgba(103,232,249,0.2),transparent_50%),#090b12]">
            <span className="text-3xl font-semibold tracking-[-0.06em] text-cyan-200/50" aria-hidden="true">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold tracking-[-0.025em] text-white">
          {project.name}
        </h3>
      </div>
    </Link>
  );
}
