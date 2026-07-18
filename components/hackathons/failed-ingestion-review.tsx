"use client";

import { ChevronDown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { InsightSectionHeading } from "@/components/hackathons/insight-section-heading";
import type { FailedProjectInsight } from "@/lib/data/hackathon-insights";

const REVIEW_ID = "failed-ingestion-review";
const OPEN_REVIEW_EVENT = "hackstack:open-failed-ingestion-review";

export function FailedIngestionLink({ count }: { count: number }) {
  function openReview(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const hash = `#${REVIEW_ID}`;

    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    window.dispatchEvent(new Event(OPEN_REVIEW_EVENT));
    window.requestAnimationFrame(() => {
      document.getElementById(REVIEW_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <a
      href={`#${REVIEW_ID}`}
      onClick={openReview}
      className="inline-flex items-center gap-1.5 text-amber-700 underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
    >
      <TriangleAlert size={12} aria-hidden="true" />
      {count} failed
    </a>
  );
}

export function FailedIngestionReview({
  projects,
}: {
  projects: FailedProjectInsight[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function openFromLocation() {
      if (window.location.hash === `#${REVIEW_ID}`) setOpen(true);
    }

    openFromLocation();
    window.addEventListener("hashchange", openFromLocation);
    window.addEventListener(OPEN_REVIEW_EVENT, openFromLocation);
    return () => {
      window.removeEventListener("hashchange", openFromLocation);
      window.removeEventListener(OPEN_REVIEW_EVENT, openFromLocation);
    };
  }, []);

  if (projects.length === 0) return null;

  return (
    <section
      id={REVIEW_ID}
      aria-labelledby="data-quality-heading"
      className="scroll-mt-24 border-t border-border pt-10"
    >
      <InsightSectionHeading
        id="data-quality-heading"
        index="05"
        title="Data quality and manual review"
        description="Review projects whose latest ingestion failed. Error messages are preserved from the ingestion pipeline."
      />

      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group border border-border bg-surface"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <TriangleAlert size={14} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {projects.length} failed {projects.length === 1 ? "project" : "projects"} require review
          </span>
          <ChevronDown
            size={15}
            className="shrink-0 text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="border-t border-border">
          {projects.map((project) => (
            <li
              key={project.slug}
              className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium">{project.name}</span>
                {project.githubUrl ? (
                  <Link
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-mono text-[11px] text-accent-text hover:underline"
                  >
                    repository
                  </Link>
                ) : null}
              </div>
              <span className="break-words font-mono text-[11px] text-muted sm:max-w-[60%] sm:text-right">
                {project.reason ?? "Unknown error"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
