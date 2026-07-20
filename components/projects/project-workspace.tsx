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
  icon?: ReactNode;
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function Pane({ label, icon, side, collapsed, onToggle, children }: PaneProps) {
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
        <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-foreground [writing-mode:vertical-rl]">
          {label}
        </span>
      </div>
    );
  }

  return (
    <section aria-label={label} className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b-2 border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-foreground">
          {icon}
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
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Floating control pinned to the divider between the two panes. */
  dividerControls?: ReactNode;
  left: ReactNode;
  right: ReactNode;
};

export function ProjectWorkspace({
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  dividerControls,
  left,
  right,
}: ProjectWorkspaceProps) {
  const isDesktop = useIsDesktop();
  const leftRef = usePanelRef();
  const rightRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [leftPercent, setLeftPercent] = useState(50);
  // The library owns the collapse threshold, so read it back rather than
  // re-deriving it from the reported size.
  const syncLeft = useCallback((size: { asPercentage: number }) => {
    setLeftCollapsed(leftRef.current?.isCollapsed() ?? false);
    setLeftPercent(size.asPercentage);
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
        {dividerControls ? (
          <div className="flex justify-center border-b-2 border-border py-3">
            {dividerControls}
          </div>
        ) : null}
        <section aria-label={leftLabel}>
          <header className="border-b-2 border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              {leftIcon}
              {leftLabel}
            </h2>
          </header>
          {left}
        </section>
        <section aria-label={rightLabel} className="border-t-2 border-border">
          <header className="border-b-2 border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              {rightIcon}
              {rightLabel}
            </h2>
          </header>
          {right}
        </section>
      </div>
    );
  }

  // Both expanded: sit on the divider. One collapsed: recentre over whatever
  // pane is still open, measuring past the collapsed rail.
  const controlsLeft = leftCollapsed && rightCollapsed
    ? "50%"
    : leftCollapsed
      ? `calc(${COLLAPSED_SIZE} + (100% - ${COLLAPSED_SIZE}) / 2)`
      : rightCollapsed
        ? `calc((100% - ${COLLAPSED_SIZE}) / 2)`
        : `${leftPercent}%`;

  return (
    <div className="relative flex min-h-0 w-full flex-1">
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
            icon={leftIcon}
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
            icon={rightIcon}
            side="right"
            collapsed={rightCollapsed}
            onToggle={toggleRight}
          >
            {right}
          </Pane>
        </Panel>
      </Group>

      {dividerControls ? (
        // Sibling of the Group, not a child: the library requires Panels and
        // Separators to be its only direct DOM children.
        // Height matches the pane header band (py-4 + text-sm line height), so
        // the controls line up with the PROJECT INFO / ANALYSIS titles.
        <div
          className="pointer-events-none absolute top-0 z-20 flex h-[3.25rem] items-center"
          style={{ left: controlsLeft }}
        >
          <div className="pointer-events-auto -translate-x-1/2">{dividerControls}</div>
        </div>
      ) : null}
    </div>
  );
}
