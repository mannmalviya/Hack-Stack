import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getProjectBySlug } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; projects: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, projects } = await params;
  const project = await getProjectBySlug(slug, projects);
  if (!project) return { title: "Project | HackStack" };
  return {
    title: `${project.name} | HackStack`,
    openGraph: project.coverImageUrl
      ? { images: [{ url: project.coverImageUrl, alt: `${project.name} cover` }] }
      : undefined,
  };
}

/** Placeholder until the pane contents are designed. */
function PanePlaceholder({ note }: { note: string }) {
  return (
    <p className="border border-dashed border-border px-6 py-16 text-center text-xs text-muted">
      {note}
    </p>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug, projects } = await params;
  const project = await getProjectBySlug(slug, projects);

  if (!project) notFound();

  return (
    <ProjectWorkspace
      leftLabel="Project Brief"
      rightLabel="Analysis"
      left={
        <div className="p-5">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">{project.name}</h1>
        </div>
      }
      right={
        <div className="p-5">
          <PanePlaceholder note="Right pane content to be designed." />
        </div>
      }
    />
  );
}
