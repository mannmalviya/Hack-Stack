import { ChevronRight, ExternalLink, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectGrid } from "@/components/projects/project-grid";
import { getHackathonBySlug, getProjectsByHackathon } from "@/lib/data/hackathons";
import { formatIndexedProjectCount, indexCoverageLabels } from "@/lib/index-coverage";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) return { title: "Hackathon | HackStack" };
  return {
    title: `${hackathon.name} | HackStack`,
    openGraph: hackathon.coverImageUrl
      ? { images: [{ url: hackathon.coverImageUrl, alt: `${hackathon.name} cover` }] }
      : undefined,
  };
}

export default async function HackathonPage({ params }: PageProps) {
  const { slug } = await params;
  const [hackathon, projects] = await Promise.all([
    getHackathonBySlug(slug),
    getProjectsByHackathon(slug),
  ]);

  if (!hackathon) notFound();
  const initials = hackathon.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
        <Link href="/hackathons" className="transition-colors hover:text-foreground">Hackathons</Link>
        <ChevronRight size={13} />
        <span className="truncate text-foreground">{hackathon.name}</span>
      </nav>

      <section className="flex flex-col gap-6 border-b border-dashed border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden bg-[#25a993] text-sm font-bold text-white">
            {hackathon.coverImageUrl ? (
              <Image
                src={hackathon.coverImageUrl}
                alt={`${hackathon.name} cover`}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{hackathon.organizer ?? "Organizer unavailable"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{hackathon.name}</h1>
            <a href={hackathon.devpostUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400">
              View source on Devpost <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 border border-border bg-surface px-3 py-2 text-xs text-muted">
          <FolderKanban size={14} />
          <span>
            {formatIndexedProjectCount(
              hackathon.indexedProjectCount,
              hackathon.availableProjectCount,
            )}
            {` · ${indexCoverageLabels[hackathon.indexCoverage]}`}
          </span>
        </div>
      </section>

      <section aria-labelledby="projects-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="projects-heading" className="text-base font-semibold">Submitted projects</h2>
            <p className="mt-1 text-xs text-muted">Browse the submission metadata currently indexed from Devpost.</p>
          </div>
          <p className="hidden text-xs text-muted sm:block">Imported from Devpost</p>
        </div>
        <ProjectGrid projects={projects} hackathonSlug={slug} />
      </section>
    </div>
  );
}
