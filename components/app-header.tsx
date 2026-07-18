import { LogIn } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CommandMenu } from "@/components/command-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="w-auto sm:w-44"><Brand /></div>
        <div className="min-w-0 flex-1 sm:mx-auto sm:max-w-xs"><CommandMenu /></div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Link href="/requests" className="hidden h-8 items-center gap-1.5 bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:flex">
            + Index Projects
          </Link>
          <ThemeToggle />
          <Link href="/login" aria-label="Sign in" className="flex h-8 items-center gap-1.5 px-2 text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            <LogIn size={14} /><span className="hidden lg:inline">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
