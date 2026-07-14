import { ChevronRight, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectGrid } from "@/components/projects/project-grid";
import { hackathons } from "@/lib/hackathons";
import { getProjectsForHackathon } from "@/lib/projects";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = hackathons.find((item) => item.slug === slug);
  return { title: hackathon ? `${hackathon.name} | HackStack` : "Hackathon | HackStack" };
}

export default async function HackathonPage({ params }: PageProps) {
  const { slug } = await params;
  const hackathon = hackathons.find((item) => item.slug === slug);

  if (!hackathon) notFound();

  const projects = getProjectsForHackathon(slug);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/hackathons" className="transition-colors hover:text-foreground">Hackathons</Link>
        <ChevronRight size={13} />
        <span className="truncate text-foreground">{hackathon.name}</span>
      </nav>

      <section className="flex flex-col gap-6 border-b border-dashed border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center text-sm font-bold text-white" style={{ backgroundColor: hackathon.accent }}>
            {hackathon.initials}
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{hackathon.organizer}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{hackathon.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{hackathon.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 border border-border bg-surface px-3 py-2 text-xs text-muted">
          <FolderKanban size={14} /> {projects.length} projects indexed
        </div>
      </section>

      <section aria-labelledby="projects-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="projects-heading" className="text-base font-semibold">Submitted projects</h2>
            <p className="mt-1 text-xs text-muted">Open a project to inspect its evidence brief and verification results.</p>
          </div>
          <p className="hidden text-xs text-muted sm:block">Recently analyzed</p>
        </div>
        <ProjectGrid projects={projects} hackathonSlug={slug} />
      </section>
    </div>
  );
}
