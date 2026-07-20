"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { hasModifier, isEditableTarget } from "@/lib/keyboard";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  function applyTheme(theme: "light" | "dark") {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    flushSync(() => setTheme(theme));
  }

  function toggleTheme() {
    if (!mounted) return;

    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => {
        ready: Promise<void>;
      };
    };

    if (!transitionDocument.startViewTransition || reduceMotion) {
      applyTheme(nextTheme);
      return;
    }

    const transition = transitionDocument.startViewTransition(() => {
      applyTheme(nextTheme);
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
    }).catch(() => applyTheme(nextTheme));
  }

  // Held in a ref so the listener is bound once instead of re-registering on
  // every theme change.
  const toggleRef = useRef(toggleTheme);
  useEffect(() => {
    toggleRef.current = toggleTheme;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (event.key !== "d" && event.key !== "D") return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      toggleRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      className="grid size-8 place-items-center border border-border bg-surface text-foreground transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      title="Toggle theme (D)"
      aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme (D)` : "Toggle theme"}
    >
      {mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
