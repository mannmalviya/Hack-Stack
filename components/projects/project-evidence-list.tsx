import { AgentLogo } from "@/components/icons/agent-logos";
import { TechnologyIcon } from "@/components/icons/technology-icon";
import type { ProjectEvidence } from "@/lib/data/project-evidence";

// Same hatch the hackathon insights use to mark a claim with no code behind it.
const CLAIMED_STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--background) 3px, var(--background) 5px)";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      {children}
    </h3>
  );
}

function EvidenceSwatch({ detected }: { detected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 ${detected ? "bg-accent" : "bg-foreground/25"}`}
      style={detected ? undefined : { backgroundImage: CLAIMED_STRIPES }}
    />
  );
}

export function ProjectEvidenceList({ evidence }: { evidence: ProjectEvidence }) {
  const detectedCount = evidence.technologies.filter((t) => t.evidence === "detected").length;
  const claimedOnly = evidence.technologies.filter((t) => t.evidence === "claimed");

  return (
    <div className="space-y-8 border-t border-border pt-8">
      <section>
        <SectionHeading>Technology</SectionHeading>

        {evidence.technologies.length === 0 ? (
          <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
            No technologies were claimed or detected for this project.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              <span className="flex items-center gap-1.5">
                <EvidenceSwatch detected />
                Found in code
              </span>
              <span className="flex items-center gap-1.5">
                <EvidenceSwatch detected={false} />
                {evidence.hasIndexedRepository ? "Claimed only" : "Not checked"}
              </span>
            </div>

            <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {evidence.technologies.map((technology) => (
                <li
                  key={technology.name}
                  className="flex items-center gap-2.5 bg-surface px-3 py-2.5"
                >
                  <EvidenceSwatch detected={technology.evidence === "detected"} />
                  <TechnologyIcon name={technology.name} className="size-4 shrink-0" />
                  <span className="truncate text-sm">{technology.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {technology.evidence === "detected"
                      ? "In code"
                      : evidence.hasIndexedRepository
                        ? "Claimed"
                        : "Unchecked"}
                  </span>
                </li>
              ))}
            </ul>

            {/* An unverified claim is only meaningful if the code was actually
                examined; say so plainly rather than implying a discrepancy. */}
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {evidence.hasIndexedRepository
                ? `${detectedCount} of ${evidence.technologies.length} appear in the indexed code.`
                  + (claimedOnly.length > 0
                    ? ` ${claimedOnly.length} claimed on Devpost could not be matched to code, which may simply mean the tool leaves no trace in the repository.`
                    : "")
                : "No repository was indexed for this project, so these Devpost claims have not been checked against code."}
            </p>
          </>
        )}
      </section>

      <section>
        <SectionHeading>AI coding agents</SectionHeading>
        {!evidence.hasIndexedRepository ? (
          <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
            No repository was indexed, so agent usage could not be checked.
          </p>
        ) : evidence.agents.length === 0 ? (
          <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
            No AI coding agent signals were found in this repository.
          </p>
        ) : (
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {evidence.agents.map((signal) => (
              <li
                key={signal.agent}
                className="flex items-center gap-2.5 bg-surface px-3 py-2.5"
              >
                <AgentLogo agent={signal.agent} className="size-4 shrink-0 text-accent" />
                <span className="truncate text-sm">{signal.agent}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  {[
                    signal.fromConfigFiles ? "Config" : null,
                    signal.fromCommits ? "Commits" : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Detected from committed agent config files and commit authorship. Absence of a
          signal is not proof an agent was unused.
        </p>
      </section>
    </div>
  );
}
