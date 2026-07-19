"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { DUR, EASE_OUT } from "@/components/motion/tokens";

/**
 * Grid cell that reveals its card on scroll like `Reveal`, but keeps a pulsing
 * card-shaped skeleton visible underneath until the reveal completes — so fast
 * scrolling shows loading placeholders instead of empty cells.
 */
export function ProjectGridCell({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative h-full border border-border">
      {!reduce && !revealed && (
        <div aria-hidden="true" className="absolute inset-0 bg-surface">
          <div className="aspect-[16/9] animate-pulse border-b border-border bg-foreground/[0.05]" />
          <div className="space-y-2 p-4">
            <div className="h-2.5 w-8 animate-pulse bg-foreground/[0.05]" />
            <div className="h-4 w-2/3 animate-pulse bg-foreground/[0.05]" />
          </div>
        </div>
      )}
      <motion.div
        className="relative h-full"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px 0px" }}
        transition={{ duration: DUR.base, delay, ease: EASE_OUT }}
        onAnimationComplete={() => setRevealed(true)}
      >
        {children}
      </motion.div>
    </div>
  );
}
