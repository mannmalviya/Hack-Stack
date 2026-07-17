"use client";

import { motion, useReducedMotion } from "motion/react";

import { DUR, EASE_OUT } from "./tokens";

/**
 * The growing inner fill of a chart bar. The caller renders the track and
 * aria labeling; `children` may hold stacked segment spans sized as
 * percentages of this fill so the whole bar grows as one unit.
 */
export function AnimatedBar({
  percent,
  delay = 0,
  className,
  children,
}: {
  percent: number;
  delay?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const width = `${percent}%`;
  return (
    <motion.div
      className={`flex h-full min-w-px ${className ?? ""}`}
      initial={reduce ? false : { width: 0 }}
      whileInView={{ width }}
      viewport={{ once: true, margin: "-40px 0px" }}
      transition={{ duration: DUR.slow, delay, ease: EASE_OUT }}
      style={reduce ? { width } : undefined}
    >
      {children}
    </motion.div>
  );
}
