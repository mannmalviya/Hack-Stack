"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { HackathonCard } from "@/components/hackathons/hackathon-card";
import type { Hackathon, HackathonLocation, HackathonStatus } from "@/lib/hackathons";

type Filters = {
  locations: HackathonLocation[];
  statuses: HackathonStatus[];
  tags: string[];
  hosts: string[];
};

const emptyFilters: Filters = { locations: [], statuses: [], tags: [], hosts: [] };

const locationOptions: { value: HackathonLocation; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In person" },
  { value: "hybrid", label: "Hybrid" },
];

const statusOptions: { value: HackathonStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "judging", label: "In judging" },
  { value: "completed", label: "Completed" },
];

function FilterOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 rounded-none border-border accent-blue-600"
      />
      {label}
    </label>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground">{title}</legend>
      <div className="space-y-2.5">{children}</div>
    </fieldset>
  );
}

export function HackathonExplorer({ hackathons }: { hackathons: Hackathon[] }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const tags = [...new Set(hackathons.flatMap((hackathon) => hackathon.tags))].slice(0, 7);
  const hosts = [...new Set(hackathons.map((hackathon) => hackathon.organizer))];

  function toggle<K extends keyof Filters>(key: K, value: Filters[K][number]) {
    setFilters((current) => {
      const selected = current[key] as string[];
      const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      return { ...current, [key]: next };
    });
  }

  const filteredHackathons = useMemo(
    () => hackathons.filter((hackathon) =>
      (!filters.locations.length || filters.locations.includes(hackathon.location)) &&
      (!filters.statuses.length || filters.statuses.includes(hackathon.status)) &&
      (!filters.tags.length || filters.tags.some((tag) => hackathon.tags.includes(tag))) &&
      (!filters.hosts.length || filters.hosts.includes(hackathon.organizer))),
    [filters, hackathons],
  );

  const activeFilterCount = Object.values(filters).reduce((total, values) => total + values.length, 0);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="border-b border-dashed border-border pb-6 lg:sticky lg:top-20 lg:border-r lg:border-b-0 lg:pr-7 lg:pb-0" aria-label="Filter hackathons">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          {activeFilterCount > 0 && (
            <button type="button" onClick={() => setFilters(emptyFilters)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-1">
          <FilterGroup title="Location">
            {locationOptions.map(({ value, label }) => <FilterOption key={value} label={label} checked={filters.locations.includes(value)} onChange={() => toggle("locations", value)} />)}
          </FilterGroup>
          <FilterGroup title="Status">
            {statusOptions.map(({ value, label }) => <FilterOption key={value} label={label} checked={filters.statuses.includes(value)} onChange={() => toggle("statuses", value)} />)}
          </FilterGroup>
          <FilterGroup title="Interest tags">
            {tags.map((tag) => <FilterOption key={tag} label={tag} checked={filters.tags.includes(tag)} onChange={() => toggle("tags", tag)} />)}
          </FilterGroup>
          <FilterGroup title="Host">
            <select
              value={filters.hosts[0] ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, hosts: event.target.value ? [event.target.value] : [] }))}
              className="h-9 w-full border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-blue-500"
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
          <p className="text-xs text-muted">{filteredHackathons.length} {filteredHackathons.length === 1 ? "result" : "results"}</p>
        </div>
        {filteredHackathons.length > 0 ? (
          <div className="space-y-4">
            {filteredHackathons.map((hackathon) => <HackathonCard key={hackathon.slug} hackathon={hackathon} />)}
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium">No hackathons match these filters.</p>
            <button type="button" onClick={() => setFilters(emptyFilters)} className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400">Clear all filters</button>
          </div>
        )}
      </section>
    </div>
  );
}
