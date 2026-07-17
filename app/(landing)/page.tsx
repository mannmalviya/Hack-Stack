import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/projects/project-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getFeaturedProjects, getHackathons } from "@/lib/data/hackathons";
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

export default async function LandingPage() {
  const [featuredProjects, hackathons] = await Promise.all([
    getFeaturedProjects(),
    getHackathons(),
  ]);
  const indexedProjects = hackathons.reduce((total, hackathon) => total + hackathon.indexedProjectCount, 0);

  return (
    <main>
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
            <Link href="/login" className="border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-foreground/40">
              Sign in
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto flex min-h-[70vh] max-w-7xl items-center px-5 py-20 sm:px-8">
          <div className="max-w-4xl">
            <Reveal>
              <p className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
                <span aria-hidden="true" className="size-2 bg-accent" />
                Evidence, not impressions
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-8 text-[clamp(3.5rem,9.5vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.05em]">
                See what they
                <span className="relative mt-2 block w-fit">
                  actually built.
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
                <Link href="#projects" className="inline-flex h-11 items-center justify-center gap-2 border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/40">
                  Browse featured projects
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="relative border-t border-border">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border border-x border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroStat value={hackathons.length} label="Hackathons indexed" />
            <HeroStat value={indexedProjects} label="Projects imported" />
            <HeroStat value={AI_CODE_AGENTS.length} label="Agent signals tracked" />
          </div>
        </div>
      </section>

      <section id="projects" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
                <span aria-hidden="true" className="mr-3">01</span>Select a signal
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Projects worth a closer look</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">Choose a project to open its evidence workspace and start exploring the build.</p>
          </div>
        </Reveal>

        {featuredProjects.length > 0 ? (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project, index) => (
              <Reveal key={`${project.hackathonSlug}:${project.slug}`} delay={Math.min(index * 0.06, 0.35)} y={10} className="h-full">
                <ProjectCard
                  project={project}
                  hackathonSlug={project.hackathonSlug}
                  index={index}
                  label={project.hackathonName}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
            No projects have been indexed yet.
          </div>
        )}
      </section>

      <section className="border-y border-border">
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
