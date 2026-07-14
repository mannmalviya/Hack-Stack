import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/hackathons"
      className="group block shrink-0 rounded-sm text-[17px] font-semibold tracking-[-0.035em] text-[#202124] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:text-zinc-100"
      aria-label="HackStack hackathons"
    >
      HackStack
    </Link>
  );
}
