export function HackStackLogo({ className }: { className?: string }) {
  return (
    // Same squared geometry as app/icon.svg so the mark stays sharp at small sizes.
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="currentColor" d="M2 1h12v2H2zM2 9h12v2H2zM2 13h12v2H2z" />
      <path fill="var(--color-accent, #25a993)" d="M2 5h12v2H2z" />
    </svg>
  );
}
