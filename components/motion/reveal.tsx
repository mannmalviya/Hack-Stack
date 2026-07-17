"use client";

import { motion, useReducedMotion } from "motion/react";

import { DUR, EASE_OUT } from "./tokens";

const tags = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  article: motion.article,
} as const;

/** Fades content in with a small upward drift the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: keyof typeof tags;
}) {
  const reduce = useReducedMotion();
  const Tag = tags[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px 0px" }}
      transition={{ duration: DUR.base, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}
