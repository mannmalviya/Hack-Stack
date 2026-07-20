"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import type { SetProjectStarResult } from "@/app/(workspace)/hackathons/[slug]/[projects]/actions";

const CHIP = "flex items-center gap-1 border border-border bg-surface p-1 shadow-lg";
const BUTTON =
  "inline-flex size-8 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Star
      size={16}
      aria-hidden="true"
      className={filled ? "fill-accent text-accent" : ""}
    />
  );
}

/**
 * Stars the current project, or sends a guest to sign in.
 *
 * Starring is a signed-in feature, but the control still renders for guests —
 * hiding it would leave no hint that signing in unlocks anything.
 */
export function StarButton({
  projectId,
  initialStarred,
  signInHref,
  onSetStar,
}: {
  projectId: string;
  initialStarred: boolean;
  /** Where a guest lands to sign in; null when the viewer is signed in. */
  signInHref: string | null;
  /** Passed down from the page so this stays decoupled from the route. */
  onSetStar: (input: { projectId: string; starred: boolean }) => Promise<SetProjectStarResult>;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (signInHref) {
    return (
      <div className={CHIP}>
        <Link
          href={signInHref}
          title="Sign in to star projects"
          aria-label="Sign in to star projects"
          className={`${BUTTON} text-muted hover:text-foreground`}
        >
          <StarIcon filled={false} />
        </Link>
      </div>
    );
  }

  function toggle() {
    const next = !starred;
    // Optimistic: the round trip is not worth a delay on a one-bit control.
    setStarred(next);
    setError(null);
    startTransition(async () => {
      const result = await onSetStar({ projectId, starred: next });
      if (result.outcome === "error") {
        setStarred(!next);
        setError(result.message);
      }
    });
  }

  const label = starred ? "Remove star" : "Star this project";
  return (
    <div className={CHIP}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={starred}
        title={error ?? label}
        aria-label={error ? `${label}. ${error}` : label}
        className={`${BUTTON} ${
          starred ? "text-accent" : "text-muted hover:text-foreground"
        } disabled:opacity-60`}
      >
        <StarIcon filled={starred} />
      </button>
    </div>
  );
}
