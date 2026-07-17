"use client";

import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { TechnologyIcon } from "@/components/icons/technology-icon";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { DUR, EASE_OUT } from "@/components/motion/tokens";
import type { TechnologyUsage } from "@/lib/insights/hackathon-analytics";

const CLAIMED_STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--background) 3px, var(--background) 5px)";

function EvidenceBadge({ evidence }: { evidence: "detected" | "claimed" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
      {evidence === "detected" ? (
        <>
          <span className="size-2 bg-accent" /> Detected
        </>
      ) : (
        <>
          <span className="size-2 bg-foreground/25" style={{ backgroundImage: CLAIMED_STRIPES }} /> Claimed
        </>
      )}
    </span>
  );
}

function TechnologyProjectsDialog({
  usage,
  hackathonSlug,
  onClose,
}: {
  usage: TechnologyUsage;
  hackathonSlug: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[15vh] backdrop-blur-[2px]"
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-border bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: DUR.fast, ease: EASE_OUT }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h3 id={titleId} className="inline-flex items-center gap-2 text-sm font-semibold">
            <TechnologyIcon name={usage.name} className="size-4 text-muted" />
            {usage.name}
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            {usage.totalProjects} {usage.totalProjects === 1 ? "project" : "projects"}
          </span>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close project list"
            className="ml-auto text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {usage.projects.length > 0 ? (
            usage.projects.map((project) => (
              <Link
                key={project.id}
                href={`/hackathons/${hackathonSlug}/${project.slug}`}
                className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0 hover:bg-foreground/[0.04]"
              >
                <span className="truncate font-medium">{project.name}</span>
                <EvidenceBadge evidence={project.evidence} />
              </Link>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Project details are unavailable for this technology.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function TechnologyList({
  items,
  hackathonSlug,
}: {
  items: TechnologyUsage[];
  hackathonSlug: string;
}) {
  const [active, setActive] = useState<TechnologyUsage | null>(null);

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No recognizable technologies were found.
      </div>
    );
  }
  const maximum = Math.max(...items.map((item) => item.totalProjects), 1);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-1.5" role="list">
        {items.map((item, index) => {
          const detectedShare = item.totalProjects > 0
            ? (item.codeDetectedProjects / item.totalProjects) * 100
            : 0;
          return (
            <div key={item.name} role="listitem">
              <button
                type="button"
                onClick={() => setActive(item)}
                aria-haspopup="dialog"
                className="group -mx-2 block w-full px-2 py-2 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
              >
                <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-foreground transition-colors group-hover:text-accent-text">
                    <TechnologyIcon name={item.name} className="size-4 text-muted transition-colors group-hover:text-accent-text" />
                    {item.name}
                    <ChevronRight
                      size={12}
                      className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                    {item.totalProjects} {item.totalProjects === 1 ? "project" : "projects"}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden bg-foreground/[0.06]"
                  aria-label={`${item.name}: ${item.codeDetectedProjects} code-detected projects and ${item.claimedOnlyProjects} claimed-only projects`}
                >
                  <AnimatedBar
                    percent={Math.max((item.totalProjects / maximum) * 100, 1)}
                    delay={Math.min(index * 0.04, 0.3)}
                  >
                    {item.codeDetectedProjects > 0 ? (
                      <span
                        className="h-full bg-accent"
                        style={{ width: `${detectedShare}%` }}
                      />
                    ) : null}
                    {item.claimedOnlyProjects > 0 ? (
                      <span
                        className="h-full bg-foreground/25"
                        style={{
                          width: `${100 - detectedShare}%`,
                          backgroundImage: CLAIMED_STRIPES,
                        }}
                      />
                    ) : null}
                  </AnimatedBar>
                </div>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
                  {item.codeDetectedProjects} code-detected
                  {item.claimedOnlyProjects > 0 ? ` · ${item.claimedOnlyProjects} claimed only` : ""}
                </p>
              </button>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {active ? (
          <TechnologyProjectsDialog
            usage={active}
            hackathonSlug={hackathonSlug}
            onClose={() => setActive(null)}
          />
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
