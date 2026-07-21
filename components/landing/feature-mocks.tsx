"use client";

import { Trophy } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { AgentLogo } from "@/components/icons/agent-logos";
import { TechnologyIcon } from "@/components/icons/technology-icon";
import { HackStackLogo } from "@/components/hackstack-logo";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { DUR, EASE_OUT } from "@/components/motion/tokens";

/*
 * Miniature animated recreations of the four product surfaces, shown on the
 * landing page. All data here is illustrative, so every panel is aria-hidden
 * and the surrounding section copy carries the accessible description.
 */

const VIEWPORT = { once: true, margin: "-40px 0px" } as const;

// Same hatch the evidence views use for a claim with no code behind it.
const CLAIMED_STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--background) 3px, var(--background) 5px)";

/** Window chrome shared by every mock: breadcrumb path left, surface tag right. */
function MockPanel({
  path,
  tag,
  children,
}: {
  path: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden="true" className="border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <HackStackLogo className="size-3 shrink-0 text-foreground" />
          <span className="truncate">{path}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-text">
          {tag}
        </span>
      </div>
      {children}
    </div>
  );
}

const popTags = {
  div: motion.div,
  li: motion.li,
  span: motion.span,
} as const;

/** Fades an element in with a small pop once it scrolls into view. */
function PopIn({
  delay = 0,
  className,
  as = "div",
  children,
}: {
  delay?: number;
  className?: string;
  as?: keyof typeof popTags;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const Tag = popTags[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: DUR.fast + 0.12, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}

function MockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{children}</p>
  );
}

/* ------------------------------- analytics ------------------------------- */

// Categorical slots from the same series palette the architecture panel uses.
const MOCK_LANGUAGES = [
  { name: "TypeScript", percent: 64, light: "#2a78d6", dark: "#3987e5" },
  { name: "Python", percent: 41, light: "#008300", dark: "#008300" },
  { name: "Rust", percent: 18, light: "#eda100", dark: "#c98500" },
];

const MOCK_AGENTS = [
  { agent: "Claude Code", percent: 46 },
  { agent: "Cursor", percent: 31 },
  { agent: "Codex", percent: 24 },
  { agent: "GitHub Copilot", percent: 17 },
] as const;

const MOCK_COVERAGE = [
  { label: "Projects", value: 214 },
  { label: "Repos indexed", value: 187 },
  { label: "Contributors", value: 903 },
];

export function AnalyticsMock() {
  return (
    <MockPanel path="hackathons / cal-hacks-12" tag="analytics">
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {MOCK_COVERAGE.map((stat) => (
          <div key={stat.label} className="min-w-0 px-4 py-4">
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.04em] sm:text-3xl">
              <AnimatedNumber value={stat.value} />
            </p>
            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="border-b border-border p-4">
        <MockLabel>Languages</MockLabel>
        <div className="mt-3 space-y-2.5">
          {MOCK_LANGUAGES.map((language, index) => (
            <div key={language.name} className="flex items-center gap-3">
              <span className="flex w-28 shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted">
                <TechnologyIcon name={language.name} className="size-3.5" />
                <span className="truncate">{language.name}</span>
              </span>
              <div className="h-2 flex-1 bg-foreground/10">
                <AnimatedBar percent={language.percent} delay={0.15 + index * 0.1}>
                  <span
                    className="series-mark w-full"
                    style={
                      {
                        "--series": language.light,
                        "--series-dark": language.dark,
                      } as React.CSSProperties
                    }
                  />
                </AnimatedBar>
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
                {language.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <MockLabel>Agent signals</MockLabel>
        <div className="mt-3 space-y-2.5">
          {MOCK_AGENTS.map((signal, index) => (
            <div key={signal.agent} className="flex items-center gap-3">
              <span className="flex w-28 shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted">
                <AgentLogo agent={signal.agent} className="size-3.5 shrink-0" />
                <span className="truncate">{signal.agent}</span>
              </span>
              <div className="h-2 flex-1 bg-foreground/10">
                <AnimatedBar
                  percent={signal.percent}
                  delay={0.35 + index * 0.1}
                  className="bg-accent"
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
                {signal.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockPanel>
  );
}

/* -------------------------------- hackers -------------------------------- */

const MOCK_HACKERS = [
  { rank: "01", name: "m-chen", commits: 128, winner: true },
  { rank: "02", name: "priya-k", commits: 97, winner: false },
  { rank: "03", name: "jltran", commits: 74, winner: false },
  { rank: "04", name: "sofia-r", commits: 61, winner: true },
  { rank: "05", name: "dvorakd", commits: 45, winner: false },
];

/**
 * GitHub-style identicon standing in for a real profile picture: the handles
 * are fictional, so a deterministic 5x5 symmetric pixel grid (GitHub's default
 * avatar look) beats showing some real user's face on the landing page.
 */
function MockAvatar({ name }: { name: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  // 15 bits fill the left three columns; the right two mirror them.
  const half = Array.from({ length: 15 }, (_, i) => ((hash >> i) & 1) === 1);
  if (!half.some(Boolean)) half[7] = true;
  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/[0.07]">
      <svg viewBox="-1.2 -1.2 7.4 7.4" className="size-5">
        {half.flatMap((on, i) => {
          if (!on) return [];
          const row = Math.floor(i / 3);
          const col = i % 3;
          const cols = col === 2 ? [2] : [col, 4 - col];
          return cols.map((c) => (
            <rect key={`${row}-${c}`} x={c} y={row} width={1.05} height={1.05} fill={`hsl(${hue} 45% 55%)`} />
          ));
        })}
      </svg>
    </span>
  );
}

const MOCK_METRICS = ["Commits", "+ Added", "− Deleted"];

export function HackersMock() {
  const max = MOCK_HACKERS[0].commits;
  return (
    <MockPanel path="cal-hacks-12 / hackers" tag="leaderboard">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        {MOCK_METRICS.map((metric, index) => (
          <span
            key={metric}
            className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${
              index === 0 ? "bg-foreground text-background" : "text-muted"
            }`}
          >
            {metric}
          </span>
        ))}
      </div>

      <ul className="divide-y divide-border">
        {MOCK_HACKERS.map((hacker, index) => (
          <li key={hacker.name} className="flex items-center gap-3 px-4 py-2">
            <span className="w-5 shrink-0 font-mono text-[10px] text-muted">{hacker.rank}</span>
            <MockAvatar name={hacker.name} />
            <span className="flex w-20 shrink-0 items-center gap-1.5 text-[13px]">
              <span className="truncate">{hacker.name}</span>
              {hacker.winner ? (
                <Trophy size={11} className="shrink-0 text-accent" />
              ) : null}
            </span>
            <div className="h-2 flex-1 bg-foreground/10">
              <AnimatedBar
                percent={(hacker.commits / max) * 100}
                delay={0.1 + index * 0.08}
                className="bg-accent"
              />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums">
              {hacker.commits}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <AnimatedNumber value={12410} /> commits · <AnimatedNumber value={903} /> contributors
      </div>
    </MockPanel>
  );
}

/* -------------------------------- ai chat -------------------------------- */

const MOCK_ANSWER =
  "Yes — the demo route opens a streaming client and pipes model output straight to the UI. The bundled mock data is only imported by tests, never the live path.";

/** Types `text` out character by character once it scrolls into view. */
function TypeText({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px 0px" });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(0);
  // With reduced motion the full text simply renders; no state is needed.
  const shown = reduce ? text.length : typed;

  useEffect(() => {
    if (!inView || reduce) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setTyped((current) => {
          const next = current + 2;
          if (next >= text.length) {
            clearInterval(interval);
            return text.length;
          }
          return next;
        });
      }, 24);
    }, delay * 1000);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [inView, reduce, text, delay]);

  return (
    // The full text sizes the box invisibly so nothing reflows while typing.
    // inline-block lets it sit after a prompt marker and still wrap long text.
    <span ref={ref} className="relative inline-block">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0">
        {text.slice(0, shown)}
        {shown < text.length ? (
          <span className="ml-px inline-block h-[1.05em] w-0.5 translate-y-[0.2em] animate-pulse bg-accent" />
        ) : null}
      </span>
    </span>
  );
}

export function CopilotMock() {
  return (
    <MockPanel path="projects / echo-notes" tag="ai analysis">
      <div className="space-y-4 p-4">
        <div className="flex justify-end">
          <p className="max-w-[85%] border border-border bg-foreground/5 px-3.5 py-2.5 text-[13px] leading-relaxed">
            Does the demo actually call the model, or is it mocked?
          </p>
        </div>

        <div className="flex">
          <div className="max-w-[92%] border border-border px-3.5 py-2.5">
            <p className="text-[13px] leading-relaxed">
              <TypeText text={MOCK_ANSWER} delay={0.7} />
            </p>
            <PopIn delay={2.9} className="mt-3 flex flex-wrap items-center gap-2">
              <span className="border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-accent-text">
                code_supported
              </span>
              <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
                app/api/generate/route.ts:41
              </span>
              <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
                lib/demo-data.ts
              </span>
            </PopIn>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span>Ask about the build…</span>
        <span>2 / 3 free questions</span>
      </div>
    </MockPanel>
  );
}

/* ----------------------------- larp detector ----------------------------- */

type MockOutcome = "verified" | "code_supported" | "claimed_only" | "blocked";

const OUTCOME_STYLES: Record<MockOutcome, string> = {
  verified: "border-accent/50 bg-accent/10 text-accent-text",
  code_supported: "border-border bg-foreground/5 text-foreground",
  claimed_only: "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  blocked: "border-red-600/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

const MOCK_CLAIMS: Array<{ claim: string; source: string; outcome: MockOutcome }> = [
  { claim: "Realtime multiplayer sync", source: "ws/session.ts", outcome: "verified" },
  { claim: "RAG over uploaded docs", source: "lib/embeddings.ts", outcome: "code_supported" },
  { claim: "On-chain audit trail", source: "no matching code", outcome: "claimed_only" },
  { claim: "Live payments", source: "demo unreachable", outcome: "blocked" },
];

function ClaimSwatch({ outcome }: { outcome: MockOutcome }) {
  if (outcome === "claimed_only") {
    return (
      <span
        className="size-2 shrink-0 bg-foreground/25"
        style={{ backgroundImage: CLAIMED_STRIPES }}
      />
    );
  }
  if (outcome === "blocked") return <span className="size-2 shrink-0 bg-red-500" />;
  return <span className="size-2 shrink-0 bg-accent" />;
}

export function LarpMock() {
  return (
    <MockPanel path="projects / echo-notes" tag="claim check">
      {/* Scan line completing before the verdicts stamp in. */}
      <div className="h-0.5 bg-foreground/10">
        <AnimatedBar percent={100} delay={0.1} className="bg-accent" />
      </div>

      <ul className="divide-y divide-border">
        {MOCK_CLAIMS.map((row, index) => (
          <PopIn key={row.claim} as="li" delay={index * 0.08} className="flex items-center gap-3 px-4 py-3">
            <ClaimSwatch outcome={row.outcome} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{row.claim}</span>
              <span className="block truncate font-mono text-[10px] text-muted">
                {row.source}
              </span>
            </span>
            <PopIn as="span" delay={0.7 + index * 0.25} className="shrink-0">
              <span
                className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${OUTCOME_STYLES[row.outcome]}`}
              >
                {row.outcome}
              </span>
            </PopIn>
          </PopIn>
        ))}
      </ul>

      <PopIn delay={1.8}>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          <span>2 of 4 claims hold up in code</span>
          <span className="text-accent-text">larp_detector v1</span>
        </div>
      </PopIn>
    </MockPanel>
  );
}

/* ----------------------------- hero terminal ----------------------------- */

const TERMINAL_OUTPUT = [
  { mark: "✓", text: "devpost submission parsed" },
  { mark: "✓", text: "repo cloned · 214 files · 4.1 MB" },
  { mark: "✓", text: "412 commits · 3 contributors" },
  { mark: "▸", text: "checking 4 claims against code…" },
];

const TERMINAL_OUTCOMES: MockOutcome[] = [
  "verified",
  "code_supported",
  "claimed_only",
  "blocked",
];

/** The hero's indexing run: command types out, the log streams, verdicts land. */
export function HeroTerminal() {
  return (
    <MockPanel path="hackstack indexer" tag="live">
      <div className="space-y-2 p-5 font-mono text-xs leading-relaxed">
        <p>
          <span className="text-accent-text">$ </span>
          <TypeText text="hackstack index echo-notes" delay={0.3} />
        </p>
        {TERMINAL_OUTPUT.map((line, index) => (
          <PopIn key={line.text} delay={1 + index * 0.28} className="flex gap-2">
            <span className="shrink-0 text-accent-text">{line.mark}</span>
            <span className="text-muted">{line.text}</span>
          </PopIn>
        ))}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TERMINAL_OUTCOMES.map((outcome, index) => (
            <PopIn key={outcome} as="span" delay={2.3 + index * 0.16}>
              <span
                className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${OUTCOME_STYLES[outcome]}`}
              >
                {outcome}
              </span>
            </PopIn>
          ))}
        </div>
        <PopIn delay={3.1} className="flex gap-2">
          <span className="shrink-0 text-accent-text">✓</span>
          <span className="text-muted">evidence brief ready — 2 of 4 claims hold up</span>
        </PopIn>
        <PopIn delay={3.5} className="flex items-center gap-1.5 pt-1">
          <span className="text-accent-text">$</span>
          <span className="inline-block h-[1.1em] w-[7px] animate-pulse bg-accent" />
        </PopIn>
      </div>
    </MockPanel>
  );
}
