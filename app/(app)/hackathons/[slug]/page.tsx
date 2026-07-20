import { ChevronRight, ExternalLink, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HackathonIndexingBanner } from "@/components/hackathons/hackathon-indexing-banner";
import { HackathonInsightsOverview } from "@/components/hackathons/hackathon-insights";
import { HackerInsights } from "@/components/hackathons/hacker-insights";
import { ProjectGrid } from "@/components/projects/project-grid";
import { getHackathonBySlug, getProjectsByHackathon } from "@/lib/data/hackathons";
import { getHackathonInsights } from "@/lib/data/hackathon-insights";
import { getHackerInsights } from "@/lib/data/hacker-insights";
import { formatIndexedProjectCount, indexCoverageLabels } from "@/lib/index-coverage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

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

export default async function HackathonPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const requestedView = (await searchParams).view;
  const view = Array.isArray(requestedView) ? requestedView[0] : requestedView;
  const activeView = view === "projects" || view === "hackers" ? view : "insights";
  const showProjects = activeView === "projects";
  const showHackerInsights = activeView === "hackers";
  const [hackathon, projects, insights, hackerInsights] = await Promise.all([
    getHackathonBySlug(slug),
    showProjects ? getProjectsByHackathon(slug) : Promise.resolve(null),
    activeView === "insights" ? getHackathonInsights(slug) : Promise.resolve(null),
    showHackerInsights ? getHackerInsights(slug) : Promise.resolve(null),
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
        <Link href="/hackathons" className="transition-colors hover:text-foreground">Hackathons</Link>
        <ChevronRight size={14} />
        <span className="truncate text-foreground">{hackathon.name}</span>
      </nav>

      <HackathonIndexingBanner hackathon={hackathon} />

      <section className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden bg-accent text-sm font-bold text-white">
            {hackathon.coverImageUrl ? (
              <Image
                src={hackathon.coverImageUrl}
                alt={`${hackathon.name} cover`}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">{hackathon.organizer ?? "Organizer unavailable"}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{hackathon.name}</h1>
            <a href={hackathon.devpostUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-text hover:underline">
              View source on Devpost <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 border border-border bg-surface px-3.5 py-2 font-mono text-[11px] tabular-nums text-muted">
          <FolderKanban size={13} />
          <span>
            {formatIndexedProjectCount(
              hackathon.indexedProjectCount,
              hackathon.availableProjectCount,
            )}
            {` · ${indexCoverageLabels[hackathon.indexCoverage]}`}
          </span>
        </div>
      </section>

      <nav aria-label="Hackathon views" className="flex border-b border-border font-mono text-xs uppercase tracking-[0.14em]">
        <Link
          href={`/hackathons/${slug}?view=projects`}
          aria-current={showProjects ? "page" : undefined}
          className={`border-b-2 px-4 py-3 font-medium transition-colors ${
            showProjects
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Projects
        </Link>
        <Link
          href={`/hackathons/${slug}`}
          aria-current={activeView === "insights" ? "page" : undefined}
          className={`border-b-2 px-4 py-3 font-medium transition-colors ${
            activeView === "insights"
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Hackathon Insights
        </Link>
        <Link
          href={`/hackathons/${slug}?view=hackers`}
          aria-current={showHackerInsights ? "page" : undefined}
          className={`border-b-2 px-4 py-3 font-medium transition-colors ${
            showHackerInsights
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Hacker Insights
        </Link>
      </nav>

      {showProjects && projects ? (
        <section aria-labelledby="projects-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 id="projects-heading" className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Submitted projects</h2>
              <p className="mt-2 text-xs text-muted">Browse the submission metadata currently indexed from Devpost.</p>
            </div>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block">Imported from Devpost</p>
          </div>
          <ProjectGrid projects={projects} hackathonSlug={slug} />
        </section>
      ) : showHackerInsights && hackerInsights ? (
        <HackerInsights
          data={hackerInsights}
          hackathonSlug={slug}
          indexingStage={hackathon.indexingStage}
          indexingStatus={hackathon.indexingStatus}
        />
      ) : insights ? (
        <HackathonInsightsOverview insights={insights} hackathonSlug={slug} />
      ) : null}
    </div>
  );
}
