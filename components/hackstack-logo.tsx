export function HackStackLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="0.75" width="16" height="3" rx="0.5" fill="currentColor" />
      <rect x="1" y="5.25" width="16" height="3" rx="0.5" fill="var(--color-accent, #25a993)" />
      <rect x="1" y="9.75" width="16" height="3" rx="0.5" fill="currentColor" />
      <rect x="1" y="14.25" width="16" height="3" rx="0.5" fill="currentColor" />
    </svg>
  );
}
