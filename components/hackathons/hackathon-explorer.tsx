"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { HackathonCard } from "@/components/hackathons/hackathon-card";
import { Reveal } from "@/components/motion/reveal";
import type { HackathonListItem, IndexingStatus } from "@/lib/data/hackathons";
import {
  compareHackathonsByDate,
  getHackathonHost,
  type HackathonDateOrder,
} from "@/lib/hackathons/explorer";

type Filters = {
  dateOrder: HackathonDateOrder;
  indexingStatuses: IndexingStatus[];
  host: string;
};

const emptyFilters: Filters = { dateOrder: "newest", indexingStatuses: [], host: "" };

const dateOrderOptions: { value: HackathonDateOrder; label: string }[] = [
  { value: "newest", label: "Newest to oldest" },
  { value: "oldest", label: "Oldest to newest" },
];

const indexingStatusOptions: { value: IndexingStatus; label: string }[] = [
  { value: "succeeded", label: "Last import succeeded" },
  { value: "partial", label: "Partially indexed" },
  { value: "running", label: "Indexing" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
];

function FilterOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 rounded-none border-border accent-accent"
      />
      {label}
    </label>
  );
}

function SortOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
      <input
        type="radio"
        name="hackathon-date-order"
        checked={checked}
        onChange={onChange}
        className="size-3.5 border-border accent-accent"
      />
      {label}
    </label>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">{title}</legend>
      <div className="space-y-2.5">{children}</div>
    </fieldset>
  );
}

export function HackathonExplorer({ hackathons }: { hackathons: HackathonListItem[] }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [isRefreshing, startRefresh] = useTransition();
  const router = useRouter();
  const hasRunningImport = hackathons.some(
    (hackathon) => hackathon.indexingStatus === "running",
  );
  const hackathonHosts = useMemo(
    () => new Map(hackathons.map((hackathon) => [hackathon.slug, getHackathonHost(hackathon.name)])),
    [hackathons],
  );
  const hosts = useMemo(
    () => [...new Set(hackathonHosts.values())].sort((left, right) => left.localeCompare(right)),
    [hackathonHosts],
  );

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isRefreshing) return;
      startRefresh(() => router.refresh());
    }, hasRunningImport ? 2000 : 10000);

    return () => window.clearInterval(refreshInterval);
  }, [hasRunningImport, isRefreshing, router]);

  function toggleIndexingStatus(value: IndexingStatus) {
    setFilters((current) => {
      const selected = current.indexingStatuses;
      const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      return { ...current, indexingStatuses: next };
    });
  }

  const filteredHackathons = useMemo(
    () => hackathons
      .filter((hackathon) =>
        (!filters.indexingStatuses.length || filters.indexingStatuses.includes(hackathon.indexingStatus)) &&
        (!filters.host || hackathonHosts.get(hackathon.slug) === filters.host))
      .sort((left, right) => compareHackathonsByDate(left, right, filters.dateOrder)),
    [filters, hackathonHosts, hackathons],
  );

  const hasNonDefaultFilters = filters.dateOrder !== emptyFilters.dateOrder ||
    filters.indexingStatuses.length > 0 || Boolean(filters.host);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="border-b border-border pb-6 lg:sticky lg:top-20 lg:border-r lg:border-b-0 lg:pr-7 lg:pb-0" aria-label="Filter hackathons">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          {hasNonDefaultFilters && (
            <button type="button" onClick={() => setFilters(emptyFilters)} className="flex items-center gap-1 text-xs text-accent-text hover:underline">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-1">
          <FilterGroup title="Date & time">
            {dateOrderOptions.map(({ value, label }) => (
              <SortOption
                key={value}
                label={label}
                checked={filters.dateOrder === value}
                onChange={() => setFilters((current) => ({ ...current, dateOrder: value }))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Indexing status">
            {indexingStatusOptions.map(({ value, label }) => <FilterOption key={value} label={label} checked={filters.indexingStatuses.includes(value)} onChange={() => toggleIndexingStatus(value)} />)}
          </FilterGroup>
          <FilterGroup title="Host">
            <select
              value={filters.host}
              onChange={(event) => setFilters((current) => ({ ...current, host: event.target.value }))}
              className="h-9 w-full border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent"
            >
              <option value="">All hosts</option>
              {hosts.map((host) => <option key={host} value={host}>{host}</option>)}
            </select>
          </FilterGroup>
        </div>
      </aside>

      <section aria-labelledby="all-hackathons-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="all-hackathons-heading" className="text-sm font-semibold">All hackathons</h2>
          <p className="font-mono text-[11px] tabular-nums text-muted">{filteredHackathons.length} {filteredHackathons.length === 1 ? "result" : "results"}</p>
        </div>
        {filteredHackathons.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {filteredHackathons.map((hackathon, index) => (
              <Reveal key={hackathon.slug} delay={Math.min(index * 0.05, 0.35)} y={10}>
                <HackathonCard hackathon={hackathon} index={index} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium">No hackathons match these filters.</p>
            <button type="button" onClick={() => setFilters(emptyFilters)} className="mt-2 text-xs text-accent-text hover:underline">Clear all filters</button>
          </div>
        )}
      </section>
    </div>
  );
}
