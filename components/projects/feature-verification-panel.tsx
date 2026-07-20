import { Check, ChevronRight } from "lucide-react";

import type {
  FeatureVerificationReport,
  VerificationOutcome,
} from "@/lib/data/feature-verification";

// One presentation per verification outcome. Colours follow the app's tone
// conventions: emerald for confirmed, amber for the claim a judge should eye,
// muted for what could not be checked.
const OUTCOME_CONFIG: Record<
  VerificationOutcome,
  { label: string; dot: string; text: string }
> = {
  verified: {
    label: "Verified",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  code_supported: {
    label: "Code-supported",
    dot: "bg-accent",
    text: "text-accent-text",
  },
  claimed_only: {
    label: "Claimed only",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-foreground/30",
    text: "text-muted",
  },
};

const OUTCOMES: VerificationOutcome[] = [
  "verified",
  "code_supported",
  "claimed_only",
  "blocked",
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      {children}
    </h3>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border px-6 py-16 text-center text-xs text-muted">
      {children}
    </p>
  );
}

// The swatch marks the outcome; verified carries a tick inside its green square
// so a confirmed feature reads at a glance.
function OutcomeSwatch({ outcome }: { outcome: VerificationOutcome }) {
  const config = OUTCOME_CONFIG[outcome];
  return (
    <span
      aria-hidden="true"
      className={`flex size-3 shrink-0 items-center justify-center ${config.dot}`}
    >
      {outcome === "verified" ? (
        <Check size={9} strokeWidth={3.5} className="text-white" />
      ) : null}
    </span>
  );
}

function OutcomeTag({ outcome }: { outcome: VerificationOutcome }) {
  const config = OUTCOME_CONFIG[outcome];
  return (
    <span
      className={`ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${config.text}`}
    >
      <OutcomeSwatch outcome={outcome} />
      {config.label}
    </span>
  );
}

function FeatureRow({
  feature,
}: {
  feature: FeatureVerificationReport["features"][number];
}) {
  return (
    <li className="bg-surface">
      {/* Native <details> keeps this a server component: no client JS needed to
          collapse, and it is keyboard-accessible for free. Collapsed by default. */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            size={14}
            aria-hidden="true"
            className="shrink-0 text-muted transition-transform group-open:rotate-90"
          />
          <span className="truncate text-sm font-medium">{feature.featureName}</span>
          <OutcomeTag outcome={feature.verificationOutcome} />
        </summary>

        <div className="space-y-2 pb-3.5 pl-[1.625rem] pr-4">
          {feature.featureClaim ? (
            <p className="text-xs leading-relaxed text-muted">{feature.featureClaim}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            <span>
              Claimed on {feature.claimSource === "devpost" ? "Devpost" : "readme"}
            </span>
            {feature.confidence ? <span>{feature.confidence} confidence</span> : null}
          </div>

          {feature.evidence.length > 0 ? (
            <ul className="space-y-1.5 border-l border-border pl-3">
              {feature.evidence.map((citation, index) => (
                <li key={`${citation.file}-${index}`} className="text-[11px] leading-relaxed">
                  <code className="font-mono text-accent-text">
                    {citation.file}
                    {citation.line !== null ? `:${citation.line}` : ""}
                  </code>
                  <span className="text-muted"> — {citation.rationale}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/**
 * The AI agent's per-feature verdict: each claimed feature tagged with how well
 * it held up against the cloned code. Every reported state (no repo, not yet
 * analysed, still running, failed, done) is explained rather than hidden.
 */
export function FeatureVerificationPanel({
  report,
}: {
  report: FeatureVerificationReport | null;
}) {
  if (!report || !report.hasRepository) {
    return (
      <div className="p-5">
        <EmptyNote>
          This project did not link a GitHub repository, so its feature claims
          have not been checked against code.
        </EmptyNote>
      </div>
    );
  }

  if (report.status === null) {
    return (
      <div className="p-5">
        <EmptyNote>This project&rsquo;s features have not been analysed yet.</EmptyNote>
      </div>
    );
  }

  if (report.status === "queued" || report.status === "running") {
    return (
      <div className="p-5">
        <EmptyNote>Feature analysis is in progress. Check back shortly.</EmptyNote>
      </div>
    );
  }

  if (report.status === "failed" && report.features.length === 0) {
    return (
      <div className="p-5">
        <div className="border border-amber-400/40 bg-amber-400/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          Feature analysis could not be completed for this project.
        </div>
      </div>
    );
  }

  if (report.features.length === 0) {
    return (
      <div className="p-5">
        <EmptyNote>
          The analysis did not find any verifiable feature claims for this
          project.
        </EmptyNote>
      </div>
    );
  }

  const counts = OUTCOMES.map((outcome) => ({
    outcome,
    count: report.features.filter((f) => f.verificationOutcome === outcome).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="space-y-6 p-5">
      <section>
        <SectionHeading>Feature verification</SectionHeading>

        {/* Summary: how the claimed features broke down by outcome. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em]">
          {counts.map(({ outcome, count }) => (
            <span
              key={outcome}
              className={`flex items-center gap-1.5 ${OUTCOME_CONFIG[outcome].text}`}
            >
              <OutcomeSwatch outcome={outcome} />
              {count} {OUTCOME_CONFIG[outcome].label}
            </span>
          ))}
        </div>

        <ul className="grid gap-px border border-border bg-border">
          {report.features.map((feature) => (
            <FeatureRow key={feature.featureName} feature={feature} />
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          An AI agent derived these features from the project&rsquo;s Devpost page
          and readme, then searched the code for each one. Verified features are
          backed by cited code; claimed-only features had no supporting code, which
          is not by itself proof a feature is missing.
        </p>
      </section>
    </div>
  );
}
