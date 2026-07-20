"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

const LEFT_PANEL_ID = "brief";
const RIGHT_PANEL_ID = "detail";

/** Collapsed panes keep a rail wide enough to hold the expand affordance. */
const COLLAPSED_SIZE = "2.75rem";
const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Below `md` the split is unusable, so the panes stack and stop resizing. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

type PaneProps = {
  label: string;
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function Pane({ label, side, collapsed, onToggle, children }: PaneProps) {
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Expand ${label}`}
          className="text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <ExpandIcon size={15} />
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted [writing-mode:vertical-rl]">
          {label}
        </span>
      </div>
    );
  }

  return (
    <section aria-label={label} className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b-2 border-border px-5 py-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {label}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Collapse ${label}`}
          className="text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <CollapseIcon size={15} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export type ProjectWorkspaceProps = {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
};

export function ProjectWorkspace({
  leftLabel,
  rightLabel,
  left,
  right,
}: ProjectWorkspaceProps) {
  const isDesktop = useIsDesktop();
  const leftRef = usePanelRef();
  const rightRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  // The library owns the collapse threshold, so read it back rather than
  // re-deriving it from the reported size.
  const syncLeft = useCallback(() => {
    setLeftCollapsed(leftRef.current?.isCollapsed() ?? false);
  }, [leftRef]);
  const syncRight = useCallback(() => {
    setRightCollapsed(rightRef.current?.isCollapsed() ?? false);
  }, [rightRef]);

  const toggleLeft = useCallback(() => {
    const panel = leftRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, [leftRef]);
  const toggleRight = useCallback(() => {
    const panel = rightRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, [rightRef]);

  if (!isDesktop) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section aria-label={leftLabel}>
          <header className="border-b-2 border-border px-5 py-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {leftLabel}
            </h2>
          </header>
          {left}
        </section>
        <section aria-label={rightLabel} className="border-t-2 border-border">
          <header className="border-b-2 border-border px-5 py-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {rightLabel}
            </h2>
          </header>
          {right}
        </section>
      </div>
    );
  }

  return (
    <Group orientation="horizontal" className="min-h-0 w-full flex-1">
      <Panel
        id={LEFT_PANEL_ID}
        panelRef={leftRef}
        onResize={syncLeft}
        minSize="24%"
        collapsible
        collapsedSize={COLLAPSED_SIZE}
      >
        <Pane
          label={leftLabel}
          side="left"
          collapsed={leftCollapsed}
          onToggle={toggleLeft}
        >
          {left}
        </Pane>
      </Panel>

      {/* Visually a 1px section divider; the Group widens its grab target. */}
      <Separator className="w-0.5 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none" />

      <Panel
        id={RIGHT_PANEL_ID}
        panelRef={rightRef}
        onResize={syncRight}
        minSize="24%"
        collapsible
        collapsedSize={COLLAPSED_SIZE}
      >
        <Pane
          label={rightLabel}
          side="right"
          collapsed={rightCollapsed}
          onToggle={toggleRight}
        >
          {right}
        </Pane>
      </Panel>
    </Group>
  );
}
