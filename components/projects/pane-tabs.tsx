"use client";

import { type ReactNode, useState } from "react";

export type PaneTab = {
  id: string;
  label: string;
  content: ReactNode;
};

/**
 * Tab strip for a workspace pane. Panels stay mounted so switching never
 * re-renders or refetches their contents, and the strip sticks to the top of
 * the pane's own scroll container.
 */
export function PaneTabs({
  ariaLabel,
  tabs,
  idPrefix,
}: {
  ariaLabel: string;
  tabs: PaneTab[];
  /** Keeps element ids unique when two tab strips share a page. */
  idPrefix: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      {/* Sticky rather than a nested scroll container: the pane already
          scrolls, and nesting two scrollers makes the wheel target ambiguous. */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="sticky top-0 z-10 flex gap-1 border-b border-border bg-background px-5"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`-mb-px border-b-2 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                selected
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idPrefix}-panel-${tab.id}`}
          aria-labelledby={`${idPrefix}-tab-${tab.id}`}
          className={tab.id === active ? undefined : "hidden"}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
