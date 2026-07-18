import type { Metadata } from "next";
import { HackathonExplorer } from "@/components/hackathons/hackathon-explorer";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import { getHackathons } from "@/lib/data/hackathons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hackathons | HackStack",
  description: "Browse approved hackathons and inspect their submitted projects.",
};

export default async function HackathonsPage() {
  const hackathons = await getHackathons();
  const completedCount = hackathons.filter(
    ({ isProcessingComplete }) => isProcessingComplete,
  ).length;

  return (
    <div className="space-y-10">
      <Reveal as="section" className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Hackathons</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Browse approved hackathons, open a project set, and review the evidence behind each submission.
          </p>
        </div>
        <div className="flex divide-x divide-border border border-border font-mono text-xs text-muted">
          <span className="px-3.5 py-2 tabular-nums">
            <AnimatedNumber value={hackathons.length} className="font-medium text-foreground" /> records
          </span>
          <span className="px-3.5 py-2 tabular-nums">
            <AnimatedNumber value={completedCount} className="font-medium text-foreground" /> completed
          </span>
        </div>
      </Reveal>

      <HackathonExplorer hackathons={hackathons} />
    </div>
  );
}
