import Link from "next/link";
import { Brand } from "@/components/brand";
import { CommandMenu } from "@/components/command-menu";
import { HeaderAuth } from "@/components/header-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md transition-colors duration-200">
      {/* Full-bleed on every page so the header reads identically whether the
          page below is a centered container or a full-width workspace. */}
      <div className="flex h-14 items-center gap-6 px-5">
        <div className="w-auto sm:w-44"><Brand /></div>
        <div className="min-w-0 flex-1 sm:mx-auto sm:max-w-xs"><CommandMenu /></div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Link href="/requests" className="hidden h-8 items-center gap-1.5 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:flex">
            + Index Projects
          </Link>
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
