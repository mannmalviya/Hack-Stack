"use client";

import { Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Re-rolls the discover feed.
 *
 * The page picks its projects at request time, so refreshing the route is the
 * whole shuffle — no client-side state to keep in sync.
 */
export function ShuffleButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex h-10 shrink-0 items-center gap-2 border border-border bg-surface px-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-60"
    >
      <Shuffle
        size={13}
        aria-hidden="true"
        className={pending ? "animate-spin" : undefined}
      />
      {pending ? "Shuffling" : "Shuffle"}
    </button>
  );
}
