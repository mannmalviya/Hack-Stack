"use client";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ProjectNeighbour } from "@/lib/data/projects";
import { hasModifier, isEditableTarget } from "@/lib/keyboard";

type ProjectNavProps = {
  hackathonSlug: string;
  previous: ProjectNeighbour | null;
  next: ProjectNeighbour | null;
};

const BUTTON = "inline-flex size-8 items-center justify-center transition-opacity";

function NavButton({
  hackathonSlug,
  project,
  direction,
}: {
  hackathonSlug: string;
  project: ProjectNeighbour | null;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "Previous project" : "Next project";
  const key = direction === "previous" ? "left arrow" : "right arrow";

  // Ends of the list stay in place as a dimmed control so the pair never
  // changes width or shifts while stepping through projects.
  if (!project) {
    return (
      <span
        aria-disabled="true"
        aria-label={`${label} (none)`}
        className={`${BUTTON} cursor-not-allowed bg-foreground/10 text-muted/50`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
    );
  }

  return (
    <Link
      href={`/hackathons/${hackathonSlug}/${project.slug}`}
      aria-label={`${label} (${key}): ${project.name}`}
      title={project.name}
      className={`${BUTTON} bg-accent text-white hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
    >
      <Icon size={16} aria-hidden="true" />
    </Link>
  );
}

/** Steps through the hackathon's projects in the same order as the gallery. */
export function ProjectNav({ hackathonSlug, previous, next }: ProjectNavProps) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (isEditableTarget(event.target)) return;
      // The resize separator binds arrow keys to resize the panes.
      if (event.target instanceof Element && event.target.closest("[role='separator']")) {
        return;
      }

      const destination = event.key === "ArrowLeft" ? previous : next;
      if (!destination) return;

      event.preventDefault();
      router.push(`/hackathons/${hackathonSlug}/${destination.slug}`);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hackathonSlug, previous, next, router]);

  return (
    <nav
      aria-label="Project navigation"
      className="flex items-center gap-1 border border-border bg-surface p-1 shadow-lg"
    >
      <Link
        href={`/hackathons/${hackathonSlug}?view=projects`}
        aria-label="Back to all projects"
        title="Back to all projects"
        className={`${BUTTON} text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
      >
        <ArrowLeft size={16} aria-hidden="true" />
      </Link>
      <NavButton hackathonSlug={hackathonSlug} project={previous} direction="previous" />
      <NavButton hackathonSlug={hackathonSlug} project={next} direction="next" />
    </nav>
  );
}
