import { GitBranch, Layers3 } from "lucide-react";
import Link from "next/link";

import {
  FailedIngestionLink,
  FailedIngestionReview,
} from "@/components/hackathons/failed-ingestion-review";
import { InsightSectionHeading } from "@/components/hackathons/insight-section-heading";
import { TechnologyList } from "@/components/hackathons/technology-list";
import { AgentLogo } from "@/components/icons/agent-logos";
import { formatBytes } from "@/lib/format";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import type { HackathonInsights } from "@/lib/data/hackathon-insights";

const CLAIMED_STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--background) 3px, var(--background) 5px)";

function CoverageCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="border-t-2 border-t-accent bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</span>
        <span className="text-muted/60">{icon}</span>
      </div>
      <p className="mt-5 text-5xl font-semibold tabular-nums tracking-[-0.04em]">
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-2 font-mono text-[11px] text-muted">{detail}</p>
    </div>
  );
}

function SubmittedProjectsCard({
  indexed,
  available,
  failed,
  partial,
}: {
  indexed: number;
  available: number | null;
  failed: number;
  partial: number;
}) {
  return (
    <div className="border-t-2 border-t-accent bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Submitted projects
        </span>
        <span className="text-muted/60"><Layers3 size={14} /></span>
      </div>
      <p className="mt-5 flex items-baseline gap-2 font-semibold tabular-nums tracking-[-0.04em]">
        <AnimatedNumber value={indexed} className="text-5xl" />
        {available !== null ? (
          <span className="text-2xl text-muted">
            / <AnimatedNumber value={available} />
          </span>
        ) : null}
      </p>
      <p className="mt-2 font-mono text-[11px] text-muted">
        {available === null ? `${indexed} indexed` : "Projects indexed with usable data"}
      </p>
      {failed > 0 || partial > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          {failed > 0 ? <FailedIngestionLink count={failed} /> : null}
          {partial > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">{partial} partial</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function HackathonInsightsOverview({
  insights,
  hackathonSlug,
}: {
  insights: HackathonInsights;
  hackathonSlug: string;
}) {
  const { coverage } = insights;
  const coverageLabel = `Based on ${coverage.usableRepositoryProjects} of ${coverage.indexedProjectCount} indexed projects with usable repository data.`;

  return (
    <div className="space-y-12">
      <section aria-labelledby="coverage-heading">
        <Reveal>
          <InsightSectionHeading
            id="coverage-heading"
            index="01"
            title="Hackathon snapshot"
            description="A coverage-aware view of the submissions and the source code currently indexed."
          />
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            <SubmittedProjectsCard
              indexed={coverage.indexedProjectCount}
              available={coverage.availableProjectCount}
              failed={coverage.failedIngestionProjects}
              partial={coverage.partialIngestionProjects}
            />
            <CoverageCard
              icon={<GitBranch size={14} />}
              label="GitHub linked"
              value={coverage.githubLinkedProjects}
              detail={`${coverage.indexedProjectCount > 0 ? Math.round((coverage.githubLinkedProjects / coverage.indexedProjectCount) * 100) : 0}% of indexed projects`}
            />
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="technology-heading" className="border-t border-border pt-10">
        <Reveal>
          <InsightSectionHeading
            id="technology-heading"
            index="02"
            title="Technology landscape"
            description="Distinct project adoption, combining Devpost claims with technologies detected in source files and dependency manifests. Click a technology to see its projects."
          />
          <div className="mb-6 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted" aria-label="Technology evidence legend">
            <span className="inline-flex items-center gap-2 border border-border bg-surface px-2 py-1">
              <span className="size-2.5 bg-accent" /> Code-detected
            </span>
            <span className="inline-flex items-center gap-2 border border-border bg-surface px-2 py-1">
              <span
                className="size-2.5 bg-foreground/25"
                style={{ backgroundImage: CLAIMED_STRIPES }}
              /> Claimed only
            </span>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Languages</h3>
              <TechnologyList items={insights.languages} hackathonSlug={hackathonSlug} />
            </div>
            <div>
              <h3 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Frameworks and platforms</h3>
              <TechnologyList items={insights.technologies} hackathonSlug={hackathonSlug} />
            </div>
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="agents-heading" className="border-t border-border pt-10">
        <Reveal>
          <InsightSectionHeading
            id="agents-heading"
            index="03"
            title="AI coding-agent signals"
            description={`${coverageLabel} Signals come from known repository paths and explicit commit attribution; they indicate evidence, not confirmed usage.`}
          />
          {insights.agentSignals.length > 0 ? (
            <div role="list">
              {insights.agentSignals.map((usage, index) => (
                <div
                  key={usage.agent}
                  role="listitem"
                  className="grid gap-2 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_1fr_8rem] sm:items-center"
                >
                  <span className="inline-flex items-center gap-2.5 text-sm font-medium">
                    <AgentLogo agent={usage.agent} className="size-4 shrink-0 text-accent" />
                    {usage.agent}
                  </span>
                  <div
                    className="h-2 overflow-hidden bg-foreground/[0.06]"
                    aria-label={`${usage.agent}: signals in ${usage.projectCount} projects, ${usage.percentage}% of usable repositories`}
                  >
                    <AnimatedBar
                      percent={Math.max(usage.percentage, 1)}
                      delay={index * 0.05}
                      className="bg-accent"
                    />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted sm:text-right">
                    {usage.projectCount} {usage.projectCount === 1 ? "project" : "projects"} · <span className="font-medium text-foreground">{usage.percentage}%</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel>
              {coverage.usableRepositoryProjects === 0
                ? "Run GitHub ingestion to detect coding-agent signals."
                : "No known coding-agent signals were detected in the indexed repositories."}
            </EmptyPanel>
          )}
        </Reveal>
      </section>

      <section aria-labelledby="size-heading" className="border-t border-border pt-10">
        <Reveal>
          <InsightSectionHeading
            id="size-heading"
            index="04"
            title="Codebase size comparison"
            description={`${coverageLabel} Size is the current indexed total of recognized, non-binary source files—not historical additions.`}
          />
          {insights.codebaseSizes.length > 0 ? (
            <>
              <div className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-3">
                <div className="border-t-2 border-t-accent bg-surface px-4 py-3 text-xs">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Largest</span>
                  <p className="mt-1.5 truncate font-medium tabular-nums">{insights.codebaseSizes[0].projectName} · {formatBytes(insights.codebaseSizes[0].sizeBytes)}</p>
                </div>
                <div className="bg-surface px-4 py-3 text-xs sm:border-t-2 sm:border-t-transparent">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Median</span>
                  <p className="mt-1.5 font-medium tabular-nums">{formatBytes(insights.medianCodebaseSizeBytes)}</p>
                </div>
                <div className="bg-surface px-4 py-3 text-xs sm:border-t-2 sm:border-t-transparent">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Smallest</span>
                  <p className="mt-1.5 truncate font-medium tabular-nums">{insights.codebaseSizes.at(-1)?.projectName} · {formatBytes(insights.codebaseSizes.at(-1)?.sizeBytes ?? 0)}</p>
                </div>
              </div>
              <div className="space-y-1" role="list">
                {insights.codebaseSizes.map((project, index) => {
                  const maximum = insights.codebaseSizes[0].sizeBytes;
                  const width = maximum > 0 ? (project.sizeBytes / maximum) * 100 : 0;
                  return (
                    <div
                      key={project.projectId}
                      role="listitem"
                      className="-mx-2 grid gap-1.5 px-2 py-1.5 transition-colors hover:bg-foreground/[0.03] sm:grid-cols-[minmax(9rem,15rem)_1fr_5rem] sm:items-center"
                    >
                      <Link
                        href={`/hackathons/${hackathonSlug}/${project.projectSlug}`}
                        className="truncate text-xs font-medium hover:text-accent-text hover:underline"
                      >
                        <span
                          className={`mr-2 inline-block w-5 font-mono tabular-nums ${
                            index < 3 ? "font-semibold text-foreground" : "text-muted"
                          }`}
                        >
                          {index + 1}
                        </span>
                        {project.projectName}
                      </Link>
                      <div
                        className="h-2 overflow-hidden bg-foreground/[0.06]"
                        aria-label={`${project.projectName}: ${formatBytes(project.sizeBytes)} of recognized source files`}
                      >
                        <AnimatedBar
                          percent={Math.max(width, 0.5)}
                          delay={Math.min(index * 0.03, 0.3)}
                          className={index === 0 ? "bg-accent" : "bg-accent/70"}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted sm:text-right">{formatBytes(project.sizeBytes)}</span>
                    </div>
                  );
                })}
              </div>
              {insights.projectsWithoutSourceData > 0 ? (
                <p className="mt-5 text-xs text-muted">
                  {insights.projectsWithoutSourceData} {insights.projectsWithoutSourceData === 1 ? "project was" : "projects were"} excluded because no recognized source files are currently indexed.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyPanel>Run GitHub ingestion to compare project codebase sizes.</EmptyPanel>
          )}
        </Reveal>
      </section>

      <FailedIngestionReview projects={insights.failedProjects} />
    </div>
  );
}
