"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  function toggleTheme() {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => {
        ready: Promise<void>;
      };
    };

    if (!transitionDocument.startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    const transition = transitionDocument.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const clipPath =
        nextTheme === "light"
          ? ["polygon(0 0, 0 0, 0 0)", "polygon(0 0, 200% 0, 0 200%)"]
          : [
              "polygon(100% 100%, 100% 100%, 100% 100%)",
              "polygon(100% 100%, -100% 100%, 100% -100%)",
            ];

      document.documentElement.animate(
        { clipPath },
        {
          duration: 480,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-8 place-items-center rounded-lg border border-[#d5d7da] bg-[#fafafa] text-[#30343a] shadow-sm transition-colors hover:bg-[#f0f1f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-border dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
      aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme` : "Toggle theme"}
    >
      {mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
