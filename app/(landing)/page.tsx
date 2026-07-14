import { ArrowRight, Orbit, Search, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LandingProjectCard, type LandingProject } from "@/components/landing/landing-project-card";

const featuredProjects: LandingProject[] = [
  {
    name: "AstraCare",
    tagline: "An AI care navigator that turns fragmented health information into a clear next step.",
    hackathon: "Global AI Hackathon",
    hackathonSlug: "global-ai-hackathon-2026",
    projectSlug: "astracare",
    category: "Health AI",
    color: "#7dd3fc",
    icon: "✦",
    sources: ["github", "demo"],
  },
  {
    name: "TerraTrace",
    tagline: "Neighborhood-scale climate intelligence for communities planning around extreme heat.",
    hackathon: "Climate Tech Build",
    hackathonSlug: "climate-tech-build",
    projectSlug: "terratrace",
    category: "Climate",
    color: "#6ee7b7",
    icon: "◎",
    sources: ["github", "demo"],
  },
  {
    name: "OrbitOps",
    tagline: "A multi-agent control room for understanding and automating complex team operations.",
    hackathon: "Agentic Commerce",
    hackathonSlug: "agentic-commerce",
    projectSlug: "orbitops",
    category: "Agents",
    color: "#c4b5fd",
    icon: "◉",
    sources: ["github"],
  },
  {
    name: "Signal Garden",
    tagline: "An open-source observability layer that makes distributed systems easier to explain.",
    hackathon: "Open Source Sprint",
    hackathonSlug: "open-source-sprint",
    projectSlug: "signal-garden",
    category: "Developer Tools",
    color: "#f9a8d4",
    icon: "⌁",
    sources: ["github", "demo"],
  },
  {
    name: "Northstar",
    tagline: "A learning companion that maps curiosity into personal, evidence-backed study paths.",
    hackathon: "Future of Learning",
    hackathonSlug: "future-of-learning",
    projectSlug: "northstar",
    category: "Education",
    color: "#fde68a",
    icon: "✺",
    sources: ["demo"],
  },
  {
    name: "Pulse Commons",
    tagline: "Privacy-conscious community health signals designed for local response teams.",
    hackathon: "Health Forward",
    hackathonSlug: "health-forward",
    projectSlug: "pulse-commons",
    category: "Social Good",
    color: "#fda4af",
    icon: "◇",
    sources: ["github", "demo"],
  },
];

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#05060a]">
      <section className="relative isolate min-h-[94vh] border-b border-white/10">
        <Image
          src="/images/hackstack-galaxy-hero.png"
          alt="A blue and violet galaxy stretching across deep space"
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,5,12,0.92)_0%,rgba(3,5,12,0.56)_48%,rgba(3,5,12,0.18)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,6,10,0.15)_0%,rgba(5,6,10,0.25)_55%,#05060a_100%)]" />

        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Landing navigation">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-[-0.04em] text-white">
            <Orbit size={20} className="text-cyan-300" /> HackStack
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/hackathons" className="hidden px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:text-white sm:block">Explore hackathons</Link>
            <Link href="/sign-in" className="border border-white/20 bg-white/7 px-3.5 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/12">Sign in</Link>
          </div>
        </nav>

        <div className="mx-auto flex min-h-[calc(94vh-4rem)] max-w-7xl items-center px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 border border-cyan-300/20 bg-cyan-300/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-cyan-100/75 backdrop-blur">
              <Sparkles size={13} /> Evidence, not impressions
            </div>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.065em] text-white sm:text-7xl lg:text-[92px]">
              See what they
              <span className="block bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">actually built.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
              Explore hackathon projects through linked evidence, inspect the code behind the claims, and ask sharper questions before judging begins.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="#projects" className="inline-flex h-11 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold text-[#080a10] transition-colors hover:bg-cyan-100">
                Enter the project galaxy <ArrowRight size={16} />
              </Link>
              <Link href="/hackathons" className="inline-flex h-11 items-center justify-center gap-2 border border-white/20 bg-black/10 px-5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/8">
                Browse all hackathons
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute right-8 bottom-8 hidden items-center gap-8 text-[10px] uppercase tracking-[0.16em] text-white/35 lg:flex">
          <span className="flex items-center gap-2"><Search size={13} /> Trace every claim</span>
          <span className="flex items-center gap-2"><ShieldCheck size={13} /> Evidence stays linked</span>
        </div>
      </section>

      <section id="projects" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="absolute top-0 left-1/2 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="relative mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/65">Select a signal</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Projects worth a closer look</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/45">Choose a project to open its evidence workspace and start exploring the build.</p>
        </div>

        <div className="relative grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project, index) => (
            <LandingProjectCard key={project.projectSlug} project={project} index={index} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.04em] text-white">Ready to chart your own course?</p>
            <p className="mt-2 text-sm text-white/45">Open the workspace and explore every approved hackathon.</p>
          </div>
          <Link href="/hackathons" className="inline-flex h-10 items-center gap-2 border border-white/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black">
            Explore HackStack <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} HackStack</span>
        <span>Built for evidence-minded judges.</span>
      </footer>
    </main>
  );
}
