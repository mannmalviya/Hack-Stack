import { Reveal } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectListItem } from "@/lib/data/hackathons";

export function ProjectGrid({ projects, hackathonSlug }: { projects: ProjectListItem[]; hackathonSlug: string }) {
  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm font-medium">No projects have been indexed yet.</p>
        <p className="mt-2 text-xs text-muted">Run the importer to populate this hackathon&apos;s projects.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project, index) => (
        <Reveal key={project.slug} delay={Math.min(index * 0.04, 0.35)} y={10} className="h-full">
          <ProjectCard project={project} hackathonSlug={hackathonSlug} index={index} />
        </Reveal>
      ))}
    </div>
  );
}
