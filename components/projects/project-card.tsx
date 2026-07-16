import Image from "next/image";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/data/hackathons";

export function ProjectCard({ project, hackathonSlug }: { project: ProjectListItem; hackathonSlug: string }) {
  return (
    <Link
      href={`/hackathons/${hackathonSlug}/${project.slug}`}
      className="group overflow-hidden border border-border bg-surface transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:border-zinc-600 dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
    >
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
      </div>

      <div className="p-4">
        <h2 className="text-base font-semibold tracking-[-0.025em] text-foreground">
          {project.name}
        </h2>
      </div>
    </Link>
  );
}
