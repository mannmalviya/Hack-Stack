import { SiGithub } from "@icons-pack/react-simple-icons";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BriefTabs } from "@/components/projects/brief-tabs";
import { DevpostBrief } from "@/components/projects/devpost-brief";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { ReadmeMarkdown } from "@/components/projects/readme-markdown";
import { getProjectBySlug } from "@/lib/data/projects";
import { getGithubReadme } from "@/lib/github/readme-cache";
import { parseGithubRepositoryUrl } from "@/lib/github/urls";

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

/** Normalises the submitted url so the link never inherits http:// or a trailing slash. */
function githubRepoUrl(githubUrl: string | null) {
  if (!githubUrl) return null;
  try {
    return parseGithubRepositoryUrl(githubUrl).canonicalUrl;
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug, projects } = await params;
  const project = await getProjectBySlug(slug, projects);
  if (!project) notFound();

  const readme = await getGithubReadme(project.githubUrl);
  const repoUrl = githubRepoUrl(project.githubUrl);

  return (
    <ProjectWorkspace
      leftLabel="Hacker Brief"
      rightLabel="Analysis"
      left={
        <BriefTabs
          actions={{
            readme: repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open repository on GitHub"
                title="Open repository on GitHub"
                className="inline-flex text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <SiGithub size={15} />
              </a>
            ) : null,
          }}
          devpost={
            <DevpostBrief
              name={project.name}
              videoUrl={project.videoUrl}
              description={project.description}
            />
          }
          readme={
            readme ? (
              <div className="p-5">
                <ReadmeMarkdown
                  content={readme.content}
                  repoFullName={readme.repoFullName}
                  gitRef={readme.ref}
                />
              </div>
            ) : (
              <div className="p-5">
                <PanePlaceholder
                  note={
                    project.githubUrl
                      ? "This repository has no readme, or GitHub could not be reached."
                      : "This project did not link a GitHub repository."
                  }
                />
              </div>
            )
          }
        />
      }
      right={
        <div className="p-5">
          <PanePlaceholder note="Right pane content to be designed." />
        </div>
      }
    />
  );
}
