"use client";

import { type ReactNode, useState } from "react";

type BriefTab = "devpost" | "readme" | "team";

const TABS: Array<{ id: BriefTab; label: string }> = [
  { id: "devpost", label: "Devpost" },
  { id: "readme", label: "Readme" },
  { id: "team", label: "Team" },
];

export type BriefTabsProps = {
  devpost: ReactNode;
  readme: ReactNode;
  team: ReactNode;
};

/** Both panels stay mounted so switching tabs never re-fetches or re-renders. */
export function BriefTabs({ devpost, readme, team }: BriefTabsProps) {
  const [active, setActive] = useState<BriefTab>("devpost");

  return (
    <div>
      {/* Sticky rather than a nested scroll container: the pane already
          scrolls, and nesting two scrollers makes the wheel target ambiguous. */}
      <div
        role="tablist"
        aria-label="Brief source"
        className="sticky top-0 z-10 flex gap-1 border-b border-border bg-background px-5"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`brief-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`brief-panel-${tab.id}`}
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

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`brief-panel-${tab.id}`}
          aria-labelledby={`brief-tab-${tab.id}`}
          className={tab.id === active ? undefined : "hidden"}
        >
          {tab.id === "devpost" ? devpost : tab.id === "readme" ? readme : team}
        </div>
      ))}
    </div>
  );
}
