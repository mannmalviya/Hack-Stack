import { LogIn } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { getHeaderAccount } from "@/lib/auth/header-account";
import { createClient } from "@/lib/supabase/server";

type HeaderAuthProps = {
  variant?: "app" | "landing";
};

export async function HeaderAuth({ variant = "app" }: HeaderAuthProps) {
  let account = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    account = getHeaderAccount(data.user);
  } catch {
    // Keep public navigation usable when auth has not been configured locally.
  }

  if (account) {
    return <AccountMenu account={account} />;
  }

  if (variant === "landing") {
    return (
      <Link
        href="/login"
        className="border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      aria-label="Sign in"
      className="flex h-8 items-center gap-1.5 px-2 text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <LogIn size={14} />
      <span className="hidden lg:inline">Sign in</span>
    </Link>
  );
}
