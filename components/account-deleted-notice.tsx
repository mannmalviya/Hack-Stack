"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AccountDeletedNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="relative z-10 border-b border-emerald-300 bg-emerald-50 px-5 py-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm">
        <CheckCircle2 size={16} />
        Your HackStack account has been deleted.
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss account deletion confirmation"
          className="ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
