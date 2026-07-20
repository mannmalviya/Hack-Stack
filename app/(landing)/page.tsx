import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AccountDeletedNotice } from "@/components/account-deleted-notice";
import { Brand } from "@/components/brand";
import { HeaderAuth } from "@/components/header-auth";
import {
  AnalyticsMock,
  CopilotMock,
  HackersMock,
  HeroTerminal,
  LarpMock,
} from "@/components/landing/feature-mocks";
import { HackStackLogo } from "@/components/hackstack-logo";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { getHackathons } from "@/lib/data/hackathons";
import { AI_CODE_AGENTS } from "@/lib/insights/hackathon-analytics";

export const dynamic = "force-dynamic";

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-6 py-5">
      <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">
        <AnimatedNumber value={value} />
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

/*
 * The showcase: one entry per product surface, each paired with an animated
 * miniature of the real screen. Copy stays short — the mock does the talking.
 */
const FEATURES = [
  {
    number: "01",
    kicker: "Hackathon analytics",
    title: "Every hackathon, quantified.",
    description:
      "Indexing coverage, language breakdowns and AI-agent adoption across every submission.",
    points: ["Coverage", "Tech stacks", "Agent signals"],
    mock: <AnalyticsMock />,
  },
  {
    number: "02",
    kicker: "Hacker analytics",
    title: "See who actually shipped.",
    description:
      "Team and contributor leaderboards built from real commit history — commits, additions, deletions.",
    points: ["Team leaderboards", "Contributor deltas", "Winner tracks"],
    mock: <HackersMock />,
  },
  {
    number: "03",
    kicker: "AI analysis",
    title: "Ask the evidence.",
    description:
      "Project Q&A that cites its answers back to the submission, the readme and the indexed code — not vibes.",
    points: ["Cited answers", "Evidence over inference", "3 free questions"],
    mock: <CopilotMock />,
  },
  {
    number: "04",
    kicker: "Larp detector",
    title: "Claimed ≠ shipped.",
    description:
      "Every feature claim checked against the code, so you know exactly where to dig before the demo starts.",
    points: ["verified", "code_supported", "claimed_only", "blocked"],
    mock: <LarpMock />,
  },
];

type LandingPageProps = {
  searchParams: Promise<{ account?: string }>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const { account } = await searchParams;
  const hackathons = await getHackathons();
  const indexedProjects = hackathons.reduce((total, hackathon) => total + hackathon.indexedProjectCount, 0);

  return (
    <main>
      {account === "deleted" ? <AccountDeletedNotice /> : null}
      <section className="relative border-b border-border">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top_left,black_35%,transparent_78%)]"
        />

        <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Landing navigation">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/hackathons" className="hidden px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground sm:block">
              Explore hackathons
            </Link>
            <ThemeToggle />
            <HeaderAuth variant="landing" />
          </div>
        </nav>

        <div className="relative mx-auto grid min-h-[70vh] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div className="max-w-4xl">
            <Reveal>
              <p className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
                <HackStackLogo className="size-3 shrink-0 text-foreground" />
                Evidence, not impressions
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-8 text-[clamp(3.5rem,9.5vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.05em]">
                What they pitched.
                <span className="relative mt-2 block w-fit">
                  What they pushed.
                  <span aria-hidden="true" className="absolute bottom-0 left-0 h-[0.045em] w-full bg-accent" />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                Explore hackathon projects through linked evidence, inspect the code behind the claims, and ask sharper questions before judging begins.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/hackathons" className="inline-flex h-11 items-center justify-center gap-2 bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85">
                  Enter the workspace <ArrowRight size={16} />
                </Link>
                <Link href="#features" className="inline-flex h-11 items-center justify-center gap-2 border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/40">
                  See what&apos;s inside
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.3} y={18} className="hidden lg:block">
            <HeroTerminal />
          </Reveal>
        </div>

        <div className="relative border-t border-border">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border border-x border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroStat value={hackathons.length} label="Hackathons indexed" />
            <HeroStat value={indexedProjects} label="Projects imported" />
            <HeroStat value={AI_CODE_AGENTS.length} label="Agent signals tracked" />
          </div>
        </div>
      </section>

      <section id="features" aria-label="Product features">
        <div className="mx-auto max-w-7xl px-5 pt-24 sm:px-8 sm:pt-32">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
              What&apos;s inside
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Four ways to see through a demo.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted">
              HackStack turns every submission into linked evidence you can question.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 sm:mt-20">
          {FEATURES.map((feature, index) => (
            <div key={feature.number} className="border-t border-border last:border-b">
              <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-20">
                <Reveal className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
                    <span aria-hidden="true" className="mr-3">{feature.number}</span>
                    {feature.kicker}
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base sm:leading-7">
                    {feature.description}
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        <span aria-hidden="true" className="size-1.5 bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={0.12} y={18} className={index % 2 === 1 ? "lg:order-1" : undefined}>
                  {feature.mock}
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Ready to chart your own course?</p>
            <p className="mt-3 text-sm text-muted">Open the workspace and explore every approved hackathon.</p>
          </div>
          <Link href="/hackathons" className="inline-flex h-11 items-center gap-2 bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85">
            Explore HackStack <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} HackStack</span>
        <span>Built for evidence-minded judges</span>
      </footer>
    </main>
  );
}
