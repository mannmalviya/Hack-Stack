"use client";

import { Command } from "cmdk";
import { FileText, FolderKanban, Search, Trophy, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DUR, EASE_OUT } from "@/components/motion/tokens";
import { searchCatalogAction } from "@/app/search-actions";
import type { SearchResults } from "@/lib/data/search";

const pages = [
  { label: "Browse hackathons", href: "/hackathons", icon: Trophy },
  { label: "Index Hackathons/Projects", href: "/requests", icon: FileText },
];

const EMPTY_RESULTS: SearchResults = { hackathons: [], projects: [] };
/** Results carry the query they answered, so stale ones are never shown. */
type QueryResults = SearchResults & { query: string };
const ITEM_CLASS =
  "flex cursor-pointer items-center gap-3 px-2 py-2.5 font-sans text-sm normal-case tracking-normal text-foreground outline-none data-[selected=true]:bg-foreground/[0.06]";
const GROUP_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResults>({ query: "", ...EMPTY_RESULTS });
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    // `stale` guards against an earlier request resolving after a later one and
    // overwriting fresher results.
    let stale = false;
    const timer = setTimeout(() => {
      searchCatalogAction(trimmed)
        .then((next) => {
          if (!stale) setResults({ query: trimmed, ...next });
        })
        .catch(() => {
          if (!stale) setResults({ query: trimmed, ...EMPTY_RESULTS });
        });
    }, 180);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  function visit(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  // Only render results that answer the query currently in the box.
  const current = hasQuery && results.query === trimmedQuery ? results : null;
  const hasResults = Boolean(current && (current.hackathons.length > 0 || current.projects.length > 0));

  return (
    <MotionConfig reducedMotion="user">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-7 w-full items-center gap-1.5 border border-border bg-surface px-2 text-left font-mono text-[11px] text-muted transition-colors duration-200 hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Search size={13} />
        <span className="min-w-0 flex-1 truncate">Search projects and hackathons</span>
        <kbd className="hidden border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[15vh] backdrop-blur-[2px]"
            onMouseDown={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="w-full max-w-xl"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: DUR.fast, ease: EASE_OUT }}
            >
              <Command
                label="Workspace search"
                // Results are already ranked by the server; cmdk's fuzzy filter
                // would reorder and drop them.
                shouldFilter={false}
                className="w-full overflow-hidden border border-border bg-surface shadow-2xl"
              >
                <div className="flex items-center gap-3 border-b border-border px-4">
                  <Search size={17} className="text-muted" />
                  <Command.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search projects and hackathons…"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                  />
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="text-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <Command.List className="max-h-72 overflow-y-auto p-2">
                  {hasQuery && !hasResults ? (
                    <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
                      {current ? "No results found." : "Searching…"}
                    </Command.Empty>
                  ) : null}

                  {current && current.hackathons.length > 0 && (
                    <Command.Group heading="Hackathons" className={GROUP_CLASS}>
                      {current.hackathons.map((hackathon) => (
                        <Command.Item
                          key={hackathon.slug}
                          value={`hackathon-${hackathon.slug}`}
                          onSelect={() => visit(`/hackathons/${hackathon.slug}`)}
                          className={ITEM_CLASS}
                        >
                          <Trophy size={16} className="shrink-0 text-muted" />
                          <span className="min-w-0 flex-1 truncate">{hackathon.name}</span>
                          {hackathon.organizer ? (
                            <span className="shrink-0 truncate font-mono text-[10px] text-muted">
                              {hackathon.organizer}
                            </span>
                          ) : null}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {current && current.projects.length > 0 && (
                    <Command.Group heading="Projects" className={GROUP_CLASS}>
                      {current.projects.map((project) => (
                        <Command.Item
                          key={`${project.hackathonSlug}/${project.slug}`}
                          value={`project-${project.hackathonSlug}-${project.slug}`}
                          onSelect={() =>
                            visit(`/hackathons/${project.hackathonSlug}/${project.slug}`)}
                          className={ITEM_CLASS}
                        >
                          <FolderKanban size={16} className="shrink-0 text-muted" />
                          <span className="min-w-0 flex-1 truncate">
                            {project.name}
                            {project.tagline ? (
                              <span className="text-muted"> — {project.tagline}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 truncate font-mono text-[10px] text-muted">
                            {project.hackathonName}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {!hasQuery && (
                    <Command.Group heading="Pages" className={GROUP_CLASS}>
                      {pages.map(({ label, href, icon: Icon }) => (
                        <Command.Item
                          key={href}
                          value={label}
                          onSelect={() => visit(href)}
                          className={ITEM_CLASS}
                        >
                          <Icon size={16} className="text-muted" />
                          {label}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
