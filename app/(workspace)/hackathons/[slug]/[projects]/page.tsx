import { Search } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalysisTabs } from "@/components/projects/analysis-tabs";
import { BriefTabs } from "@/components/projects/brief-tabs";
import { DevpostBrief } from "@/components/projects/devpost-brief";
import { ProjectNav } from "@/components/projects/project-nav";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { ReadmeMarkdown } from "@/components/projects/readme-markdown";
import { ProjectEvidenceList } from "@/components/projects/project-evidence-list";
import { SourceLink } from "@/components/projects/source-link";
import { TeamStats } from "@/components/projects/team-stats";
import { StarButton } from "@/components/projects/star-button";
import { getProjectArchitecture } from "@/lib/architecture/project-architecture";
import { getSignedInUserId } from "@/lib/auth/current-user";
import { getProjectEvidence } from "@/lib/data/project-evidence";
import { isProjectStarred } from "@/lib/data/stars";
import { setProjectStar } from "./actions";
import { getProjectTeamStats } from "@/lib/data/project-team";
import { getProjectBySlug, getProjectNeighbours } from "@/lib/data/projects";
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

  const userId = await getSignedInUserId();
  const [readme, neighbours, teamStats, evidence, architecture, starred] = await Promise.all([
    getGithubReadme(project.githubUrl),
    getProjectNeighbours(slug, projects),
    getProjectTeamStats(slug, projects),
    getProjectEvidence(slug, projects),
    getProjectArchitecture(slug, projects),
    isProjectStarred(userId, project.id),
  ]);
  const repoUrl = githubRepoUrl(project.githubUrl);

  return (
    <ProjectWorkspace
      leftLabel="Project Info"
      rightLabel="Analysis"
      rightIcon={<Search size={16} aria-hidden="true" />}
      dividerControls={
        <div className="flex items-center gap-2">
          <ProjectNav
            hackathonSlug={project.hackathonSlug}
            previous={neighbours.previous}
            next={neighbours.next}
          />
          <StarButton
            projectId={project.id}
            initialStarred={starred}
            signInHref={
              userId
                ? null
                : `/login?next=/hackathons/${project.hackathonSlug}/${project.slug}`
            }
            onSetStar={setProjectStar}
          />
        </div>
      }
      left={
        <BriefTabs
          devpost={
            <DevpostBrief
              name={project.name}
              videoUrl={project.videoUrl}
              devpostUrl={project.devpostUrl}
              description={project.description}
              isWinner={project.isWinner}
              winningTrack={project.winningTrack}
            />
          }
          readme={
            readme ? (
              <div className="space-y-5 p-5">
                {repoUrl ? (
                  <div className="flex justify-end">
                    <SourceLink source="github" href={repoUrl} />
                  </div>
                ) : null}
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
        <AnalysisTabs
          architecture={architecture}
          hasGithubUrl={Boolean(project.githubUrl)}
          team={
            <TeamStats
              stats={teamStats}
              hackathonSlug={project.hackathonSlug}
              evidence={
                evidence ? <ProjectEvidenceList evidence={evidence} /> : null
              }
            />
          }
          hackathonSlug={slug}
          projectSlug={projects}
        />
      }
    />
  );
}
