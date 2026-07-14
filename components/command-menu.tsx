"use client";

import { Command } from "cmdk";
import { FileText, Search, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const pages = [
  { label: "Browse hackathons", href: "/hackathons", icon: Trophy },
  { label: "Request a hackathon", href: "/requests", icon: FileText },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
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

  function visit(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-7 w-full items-center gap-1.5 rounded-md border border-[#e1e3e6] bg-[#f8f9fa] px-2 text-left text-[11px] text-[#7a7e83] transition-colors duration-200 hover:border-[#c9ccd1] hover:text-[#3c4043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-[#303034] dark:bg-white/5 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
      >
        <Search size={14} />
        <span className="min-w-0 flex-1 truncate">Search projects and hackathons</span>
        <kbd className="hidden rounded border border-[#e1e3e6] bg-white px-1.5 py-0.5 font-sans text-[10px] text-[#8b8f94] transition-colors duration-200 dark:border-[#38383d] dark:bg-[#18181b] dark:text-zinc-400 sm:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[15vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <Command
            label="Workspace search"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={17} className="text-muted" />
              <Command.Input
                autoFocus
                placeholder="Search projects and hackathons…"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="text-muted hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <Command.List className="max-h-72 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted">No results found.</Command.Empty>
              <Command.Group heading="Pages" className="text-xs text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {pages.map(({ label, href, icon: Icon }) => (
                  <Command.Item
                    key={href}
                    value={label}
                    onSelect={() => visit(href)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-sm text-foreground outline-none data-[selected=true]:bg-foreground/7"
                  >
                    <Icon size={16} className="text-muted" />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
