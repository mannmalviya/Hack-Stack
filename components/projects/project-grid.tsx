import { ProjectCard } from "@/components/projects/project-card";
import type { Project } from "@/lib/projects";

export function ProjectGrid({ projects, hackathonSlug }: { projects: Project[]; hackathonSlug: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} hackathonSlug={hackathonSlug} />
      ))}
    </div>
  );
}
