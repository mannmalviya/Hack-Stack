import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/hackathons"
      className="group inline-flex shrink-0 items-baseline gap-2 text-[17px] font-semibold tracking-[-0.04em] text-foreground outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/50"
      aria-label="HackStack hackathons"
    >
      <span aria-hidden="true" className="size-2.5 self-center bg-accent" />
      HackStack
    </Link>
  );
}
