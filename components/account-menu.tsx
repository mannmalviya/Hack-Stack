"use client";

import { LogOut, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { AccountAvatar } from "@/components/account-avatar";
import type { HeaderAccount } from "@/lib/auth/header-account";

export function AccountMenu({ account }: { account: HeaderAccount }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 max-w-44 items-center gap-2 px-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <AccountAvatar
          avatarUrl={account.avatarUrl}
          displayName={account.displayName}
        />
        <span className="truncate">{account.displayName}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 border border-border bg-surface p-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <UserRound size={15} />
            Profile
          </Link>
          <Link
            href="/starred"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Star size={15} />
            Starred
          </Link>
          <form action="/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
