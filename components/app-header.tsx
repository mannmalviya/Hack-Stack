import { LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CommandMenu } from "@/components/command-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-[#dedede] bg-white/95 text-[#202124] backdrop-blur-md transition-colors duration-200 dark:border-[#343434] dark:bg-[#101010]/95 dark:text-zinc-100">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="w-auto sm:w-44"><Brand /></div>
        <div className="min-w-0 flex-1 sm:mx-auto sm:max-w-xs"><CommandMenu /></div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Link href="/requests" className="hidden h-8 items-center gap-1.5 rounded-md bg-[#2878f0] px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#1769dd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 sm:flex">
            <Plus size={14} /> Request hackathon
          </Link>
          <ThemeToggle />
          <Link href="/sign-in" aria-label="Sign in" className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#5f6368] transition-colors hover:bg-black/4 hover:text-[#202124] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-zinc-100">
            <LogIn size={14} /><span className="hidden lg:inline">Sign in</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
