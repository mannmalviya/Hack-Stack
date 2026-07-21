"use client";

import { Check, Copy, Download, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";

type CopyState = "idle" | "loading" | "copied" | "error";

/**
 * Exports the project's AI-agent context bundle: copy to clipboard for pasting
 * into a chat, or download as a markdown file. The first request assembles the
 * bundle server-side (GitHub fetches included), so it can take a few seconds;
 * repeats are served from cache.
 */
export function ExportContextButton({
  hackathonSlug,
  projectSlug,
}: {
  hackathonSlug: string;
  projectSlug: string;
}) {
  const [state, setState] = useState<CopyState>("idle");

  const exportUrl = `/api/hackathons/${encodeURIComponent(hackathonSlug)}/projects/${encodeURIComponent(projectSlug)}/export`;

  async function copyToClipboard() {
    setState("loading");
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error(`export returned ${response.status}`);
      await navigator.clipboard.writeText(await response.text());
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  const buttonClass =
    "inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-60";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copyToClipboard}
        disabled={state === "loading"}
        className={buttonClass}
      >
        {state === "loading" ? (
          <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />
        ) : state === "copied" ? (
          <Check size={13} aria-hidden="true" />
        ) : state === "error" ? (
          <TriangleAlert size={13} aria-hidden="true" />
        ) : (
          <Copy size={13} aria-hidden="true" />
        )}
        {state === "loading"
          ? "Assembling…"
          : state === "copied"
            ? "Copied"
            : state === "error"
              ? "Export failed"
              : "Copy context"}
      </button>
      <a href={`${exportUrl}?download=1`} download className={buttonClass}>
        <Download size={13} aria-hidden="true" />
        .md
      </a>
    </div>
  );
}
