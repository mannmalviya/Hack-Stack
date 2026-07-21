"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectGridCell } from "@/components/projects/project-grid-cell";
import type { HackathonProjectListItem } from "@/lib/data/hackathons";

export function ProjectGrid({ projects, hackathonSlug }: { projects: HackathonProjectListItem[]; hackathonSlug: string }) {
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);

  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm font-medium">No projects have been indexed yet.</p>
        <p className="mt-2 text-xs text-muted">Run the importer to populate this hackathon&apos;s projects.</p>
      </div>
    );
  }

  const visibleProjects = showWinnersOnly
    ? projects.filter((project) => project.isWinner)
    : projects;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground">
          <input
            type="checkbox"
            checked={showWinnersOnly}
            onChange={(event) => setShowWinnersOnly(event.target.checked)}
            className="size-3.5 cursor-pointer rounded-none border-border accent-accent"
          />
          Winners only
        </label>
      </div>

      {visibleProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <ProjectGridCell key={project.slug} delay={Math.min(index * 0.04, 0.35)}>
              <ProjectCard
                project={project}
                hackathonSlug={hackathonSlug}
                index={index}
                quickAccess={{
                  contributors: project.contributors,
                  agentSignals: project.agentSignals,
                }}
              />
            </ProjectGridCell>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No winning projects found.</p>
          <p className="mt-2 text-xs text-muted">Show all projects to continue browsing this hackathon.</p>
        </div>
      )}
    </div>
  );
}
