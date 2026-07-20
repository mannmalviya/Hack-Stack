import Link from "next/link";
import { HackStackLogo } from "@/components/hackstack-logo";

export function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex shrink-0 items-baseline gap-2 text-[17px] font-semibold tracking-[-0.04em] text-foreground outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/50"
      aria-label="HackStack home"
    >
      <HackStackLogo className="size-4 shrink-0 self-center" />
      HackStack
    </Link>
  );
}
