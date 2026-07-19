"use client";

import { Trash2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setConfirmation("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-red-800"
      >
        <Trash2 size={15} />
        Delete account
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[15vh] backdrop-blur-[2px]"
          onMouseDown={close}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md border border-red-300 bg-surface shadow-2xl dark:border-red-900"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center border-b border-red-200 px-5 py-4 dark:border-red-950">
              <h2 id={titleId} className="font-semibold text-red-700 dark:text-red-400">
                Permanently delete account
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close delete account dialog"
                className="ml-auto text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                <X size={18} />
              </button>
            </div>

            <form action="/profile/delete" method="post" className="space-y-5 p-5">
              <div className="space-y-2 text-sm leading-6 text-muted">
                <p>
                  This permanently deletes your HackStack account, linked login
                  identities, indexing requests, and private account data.
                </p>
                <p>
                  Your Google or GitHub account will not be deleted. Public
                  project data already indexed by HackStack may remain.
                </p>
              </div>

              <label className="block text-sm font-medium text-foreground">
                Type <span className="font-mono text-red-700 dark:text-red-400">DELETE</span> to confirm
                <input
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-2 h-10 w-full border border-border bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="h-10 border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmation !== "DELETE"}
                  className="h-10 bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete permanently
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
