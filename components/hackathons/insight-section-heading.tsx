import { Info } from "lucide-react";

export function InsightSectionHeading({
  id,
  index,
  title,
  description,
}: {
  id: string;
  index: string;
  title: string;
  description: string;
}) {
  const descriptionId = `${id}-description`;

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
        <span className="mr-3 font-mono text-xs font-normal tabular-nums text-accent-text" aria-hidden="true">
          {index}
        </span>
        {title}
      </h2>
      <details className="group relative shrink-0">
        <summary
          aria-label={`About ${title}`}
          aria-describedby={descriptionId}
          className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/50 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [&::-webkit-details-marker]:hidden"
        >
          <Info size={16} aria-hidden="true" />
        </summary>
        <p
          id={descriptionId}
          role="tooltip"
          className="pointer-events-none absolute top-full right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-border bg-background p-3 text-left text-xs leading-5 text-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-open:pointer-events-auto group-open:opacity-100"
        >
          {description}
        </p>
      </details>
    </div>
  );
}
