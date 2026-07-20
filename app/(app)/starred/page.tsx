import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectCard } from "@/components/projects/project-card";
import { getSignedInUserId } from "@/lib/auth/current-user";
import { getStarredProjects } from "@/lib/data/stars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Starred projects | HackStack",
};

export default async function StarredPage() {
  const userId = await getSignedInUserId();
  if (!userId) {
    redirect("/login?next=/starred");
  }

  const projects = await getStarredProjects(userId);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
          Saved
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
          Starred projects
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          {projects.length > 0
            ? `${projects.length} project${projects.length === 1 ? "" : "s"} you saved, most recently starred first.`
            : "Projects you star are collected here so you can come back to them."}
        </p>
      </header>

      <section aria-labelledby="starred-projects" className="mt-10">
        <h2 id="starred-projects" className="sr-only">
          Your starred projects
        </h2>

        {projects.length > 0 ? (
          // Stars span hackathons, so each card is labelled with the event it
          // came from rather than a position in one gallery.
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={`${project.hackathonSlug}:${project.slug}`}
                project={project}
                hackathonSlug={project.hackathonSlug}
                index={index}
                label={project.hackathonName}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-20 text-center">
            <p className="text-sm text-muted">
              You haven&rsquo;t starred any projects yet.
            </p>
            <Link
              href="/hackathons"
              className="mt-4 inline-flex items-center border border-border px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Browse hackathons
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
