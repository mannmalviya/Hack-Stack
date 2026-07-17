import Link from "next/link";
import { Brand } from "@/components/brand";

function DiscordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.2 7.2a13.3 13.3 0 0 1 7.6 0M9.1 17.3l-1.7 2.1c-2.7-.9-3.7-2.1-3.7-2.1C2.6 12.1 5.1 7.8 5.1 7.8A9 9 0 0 1 8 6.4l.7 1.3M14.9 17.3l1.7 2.1c2.7-.9 3.7-2.1 3.7-2.1 1.1-5.2-1.4-9.5-1.4-9.5A9 9 0 0 0 16 6.4l-.7 1.3" />
      <path d="M8.5 15.7c2.3 1.3 4.7 1.3 7 0" />
      <circle cx="9" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Brand />
            <p className="max-w-sm text-xs leading-5 text-muted">Evidence-backed project review for hackathon judges.</p>
          </div>
          <Link
            href="https://discord.gg/u85Y2RJmPN"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
          >
            <DiscordIcon /> Discord
          </Link>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} HackStack</span>
          <span>Evidence, not impressions</span>
        </div>
      </div>
    </footer>
  );
}
