"use client";

import { useEffect, useRef, useState } from "react";

import type { IndexingStage } from "@/lib/data/hackathons";

export function HackathonStageProgress({
  stage,
  completed,
  total,
}: {
  stage: IndexingStage | null;
  completed: number;
  total: number | null;
}) {
  const targetPercentage = stage !== "discovering_projects" && total && total > 0
    ? Math.min(Math.max((completed / total) * 100, 0), 100)
    : 0;
  const previousStage = useRef(stage);
  const [displayedPercentage, setDisplayedPercentage] = useState(0);

  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      setDisplayedPercentage(0);
      const frame = window.requestAnimationFrame(() => {
        setDisplayedPercentage(targetPercentage);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setDisplayedPercentage((current) => Math.max(current, targetPercentage));
  }, [stage, targetPercentage]);

  return (
    <span
      aria-hidden="true"
      className="h-1 w-5 shrink-0 overflow-hidden bg-foreground/10"
    >
      <span
        className="block h-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${displayedPercentage}%` }}
      />
    </span>
  );
}
