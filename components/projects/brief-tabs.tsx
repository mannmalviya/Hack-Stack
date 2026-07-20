"use client";

import { type ReactNode, useState } from "react";

type BriefTab = "devpost" | "readme";

const TABS: Array<{ id: BriefTab; label: string }> = [
  { id: "devpost", label: "Devpost" },
  { id: "readme", label: "Readme" },
];

export type BriefTabsProps = {
  devpost: ReactNode;
  readme: ReactNode;
  /** Trailing control shown in the tab strip, per tab. */
  actions?: Partial<Record<BriefTab, ReactNode>>;
};

/** Both panels stay mounted so switching tabs never re-fetches or re-renders. */
export function BriefTabs({ devpost, readme, actions }: BriefTabsProps) {
  const [active, setActive] = useState<BriefTab>("devpost");

  return (
    <div>
      {/* Sticky rather than a nested scroll container: the pane already
          scrolls, and nesting two scrollers makes the wheel target ambiguous. */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-5">
        <div role="tablist" aria-label="Brief source" className="flex gap-1">
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
        {actions?.[active] ? (
          <div className="ml-auto pl-4">{actions[active]}</div>
        ) : null}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`brief-panel-${tab.id}`}
          aria-labelledby={`brief-tab-${tab.id}`}
          className={tab.id === active ? undefined : "hidden"}
        >
          {tab.id === "devpost" ? devpost : readme}
        </div>
      ))}
    </div>
  );
}
