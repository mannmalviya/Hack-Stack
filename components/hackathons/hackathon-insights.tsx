import { Bot, Braces, DatabaseZap, GitBranch, Layers3 } from "lucide-react";
import Link from "next/link";

import type { HackathonInsights } from "@/lib/data/hackathon-insights";
import type { TechnologyUsage } from "@/lib/insights/hackathon-analytics";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unitIndex);
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function CoverageCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
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

function TechnologyList({ items }: { items: TechnologyUsage[] }) {
  if (items.length === 0) {
    return <EmptyPanel>No recognizable technologies were found.</EmptyPanel>;
  }
  const maximum = Math.max(...items.map((item) => item.totalProjects), 1);

  return (
    <div className="space-y-4" role="list">
      {items.map((item) => {
        const detectedShare = item.totalProjects > 0
          ? (item.codeDetectedProjects / item.totalProjects) * 100
          : 0;
        return (
          <div key={item.name} role="listitem">
            <div className="mb-1.5 flex items-baseline justify-between gap-4 text-xs">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="shrink-0 text-muted">
                {item.totalProjects} {item.totalProjects === 1 ? "project" : "projects"}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
              aria-label={`${item.name}: ${item.codeDetectedProjects} code-detected projects and ${item.claimedOnlyProjects} claimed-only projects`}
            >
              <div
                className="flex h-full min-w-px"
                style={{ width: `${Math.max((item.totalProjects / maximum) * 100, 1)}%` }}
              >
                {item.codeDetectedProjects > 0 ? (
                  <span
                    className="h-full bg-[#25a993]"
                    style={{ width: `${detectedShare}%` }}
                  />
                ) : null}
                {item.claimedOnlyProjects > 0 ? (
                  <span
                    className="h-full bg-blue-500/45"
                    style={{
                      width: `${100 - detectedShare}%`,
                      backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,.65) 3px, rgba(255,255,255,.65) 5px)",
                    }}
                  />
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {item.codeDetectedProjects} code-detected
              {item.claimedOnlyProjects > 0 ? ` · ${item.claimedOnlyProjects} claimed only` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
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
  const ingestionIssueCount = coverage.partialIngestionProjects + coverage.failedIngestionProjects;
  const coverageLabel = `Based on ${coverage.usableRepositoryProjects} of ${coverage.totalProjects} projects with usable repository data.`;

  return (
    <div className="space-y-10">
      <section aria-labelledby="coverage-heading">
        <SectionHeading
          id="coverage-heading"
          title="Hackathon snapshot"
          description="A coverage-aware view of the submissions and the source code currently indexed."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageCard
            icon={<Layers3 size={14} />}
            label="Submitted projects"
            value={coverage.totalProjects.toLocaleString()}
            detail="Indexed from Devpost"
          />
          <CoverageCard
            icon={<GitBranch size={14} />}
            label="GitHub linked"
            value={coverage.githubLinkedProjects.toLocaleString()}
            detail={`${coverage.totalProjects > 0 ? Math.round((coverage.githubLinkedProjects / coverage.totalProjects) * 100) : 0}% of projects`}
          />
          <CoverageCard
            icon={<DatabaseZap size={14} />}
            label="Repository data"
            value={coverage.usableRepositoryProjects.toLocaleString()}
            detail="Projects with recognized source files"
          />
          <CoverageCard
            icon={<Braces size={14} />}
            label="Indexed source size"
            value={formatBytes(coverage.totalSourceBytes)}
            detail="Recognized, non-binary source files"
          />
        </div>
        {coverage.partialIngestionProjects > 0 || coverage.failedIngestionProjects > 0 ? (
          <p className="mt-3 border-l-2 border-amber-500/70 bg-amber-500/5 px-3 py-2 text-xs text-muted">
            Latest ingestion outcomes include {coverage.partialIngestionProjects} partial and {coverage.failedIngestionProjects} failed {ingestionIssueCount === 1 ? "project" : "projects"}. Existing repository data may reflect the last usable snapshot.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="technology-heading" className="border-t border-dashed border-border pt-8">
        <SectionHeading
          id="technology-heading"
          title="Technology landscape"
          description="Distinct project adoption, combining Devpost claims with technologies detected in source files and dependency manifests."
        />
        <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted" aria-label="Technology evidence legend">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 bg-[#25a993]" /> Code-detected
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="size-2.5 bg-blue-500/45"
              style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,.75) 2px, rgba(255,255,255,.75) 3px)" }}
            /> Claimed only
          </span>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Languages</h3>
            <TechnologyList items={insights.languages} />
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Frameworks and platforms</h3>
            <TechnologyList items={insights.technologies} />
          </div>
        </div>
      </section>

      <section aria-labelledby="agents-heading" className="border-t border-dashed border-border pt-8">
        <SectionHeading
          id="agents-heading"
          title="AI coding-agent signals"
          description={`${coverageLabel} Signals come from known repository paths and explicit commit attribution; they indicate evidence, not confirmed usage.`}
        />
        {insights.agentSignals.length > 0 ? (
          <div className="space-y-4" role="list">
            {insights.agentSignals.map((usage) => (
              <div key={usage.agent} role="listitem" className="grid gap-2 sm:grid-cols-[10rem_1fr_7rem] sm:items-center">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Bot size={14} className="text-[#25a993]" />
                  {usage.agent}
                </span>
                <div
                  className="h-2 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                  aria-label={`${usage.agent}: signals in ${usage.projectCount} projects, ${usage.percentage}% of usable repositories`}
                >
                  <div className="h-full min-w-px bg-[#25a993]" style={{ width: `${Math.max(usage.percentage, 1)}%` }} />
                </div>
                <span className="text-xs text-muted sm:text-right">
                  {usage.projectCount} {usage.projectCount === 1 ? "project" : "projects"} · {usage.percentage}%
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
      </section>

      <section aria-labelledby="size-heading" className="border-t border-dashed border-border pt-8">
        <SectionHeading
          id="size-heading"
          title="Codebase size comparison"
          description={`${coverageLabel} Size is the current indexed total of recognized, non-binary source files—not historical additions.`}
        />
        {insights.codebaseSizes.length > 0 ? (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="border border-border px-3 py-2 text-xs">
                <span className="text-muted">Largest</span>
                <p className="mt-1 truncate font-medium">{insights.codebaseSizes[0].projectName} · {formatBytes(insights.codebaseSizes[0].sizeBytes)}</p>
              </div>
              <div className="border border-border px-3 py-2 text-xs">
                <span className="text-muted">Median</span>
                <p className="mt-1 font-medium">{formatBytes(insights.medianCodebaseSizeBytes)}</p>
              </div>
              <div className="border border-border px-3 py-2 text-xs">
                <span className="text-muted">Smallest</span>
                <p className="mt-1 truncate font-medium">{insights.codebaseSizes.at(-1)?.projectName} · {formatBytes(insights.codebaseSizes.at(-1)?.sizeBytes ?? 0)}</p>
              </div>
            </div>
            <div className="space-y-3" role="list">
              {insights.codebaseSizes.map((project, index) => {
                const maximum = insights.codebaseSizes[0].sizeBytes;
                const width = maximum > 0 ? (project.sizeBytes / maximum) * 100 : 0;
                return (
                  <div key={project.projectId} role="listitem" className="grid gap-1.5 sm:grid-cols-[minmax(9rem,15rem)_1fr_5rem] sm:items-center">
                    <Link
                      href={`/hackathons/${hackathonSlug}/${project.projectSlug}`}
                      className="truncate text-xs font-medium hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                    >
                      <span className="mr-2 tabular-nums text-muted">{index + 1}</span>
                      {project.projectName}
                    </Link>
                    <div
                      className="h-2 overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                      aria-label={`${project.projectName}: ${formatBytes(project.sizeBytes)} of recognized source files`}
                    >
                      <div className="h-full min-w-px bg-blue-500/75" style={{ width: `${Math.max(width, 0.5)}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted sm:text-right">{formatBytes(project.sizeBytes)}</span>
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
      </section>
    </div>
  );
}
