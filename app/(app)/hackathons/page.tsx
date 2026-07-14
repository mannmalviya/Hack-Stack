import type { Metadata } from "next";
import { HackathonExplorer } from "@/components/hackathons/hackathon-explorer";
import { hackathons } from "@/lib/hackathons";

export const metadata: Metadata = {
  title: "Hackathons | HackStack",
  description: "Browse approved hackathons and inspect their submitted projects.",
};

export default function HackathonsPage() {
  const activeCount = hackathons.filter(({ status }) => status !== "completed").length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 border-b border-dashed border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Judge workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Hackathons</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Browse approved hackathons, open a project set, and review the evidence behind each submission.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5">{hackathons.length} indexed</span>
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5">{activeCount} active</span>
        </div>
      </section>

      <HackathonExplorer hackathons={hackathons} />
    </div>
  );
}
