import { Trophy } from "lucide-react";
import { SourceLink } from "@/components/projects/source-link";
import { splitDevpostDescription } from "@/lib/devpost/description";

type DevpostBriefProps = {
  name: string;
  devpostUrl: string;
  videoUrl: string | null;
  description: string | null;
  isWinner: boolean;
  winningTrack: string | null;
};

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
      {children}
    </p>
  );
}

export function DevpostBrief({
  name,
  devpostUrl,
  videoUrl,
  description,
  isWinner,
  winningTrack,
}: DevpostBriefProps) {
  const sections = description ? splitDevpostDescription(description, name) : [];

  return (
    <div className="space-y-8 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {isWinner ? (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 border border-accent/50 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-foreground">
                <Trophy size={12} className="shrink-0 text-accent-text" aria-hidden="true" />
                Winner
              </span>
              {/* Track names run long (some carry the full prize description),
                  so they wrap on their own line rather than truncating. */}
              {winningTrack ? (
                <p className="mt-2 text-xs leading-relaxed text-muted">{winningTrack}</p>
              ) : null}
            </div>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">{name}</h1>
        </div>
        <SourceLink source="devpost" href={devpostUrl} />
      </div>

      {videoUrl ? (
        <div className="relative aspect-video w-full border border-border bg-foreground/[0.03]">
          <iframe
            src={videoUrl}
            title={`${name} demo video`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full"
          />
        </div>
      ) : (
        <EmptyNote>This project did not submit a demo video on Devpost.</EmptyNote>
      )}

      {sections.length > 0 ? (
        <div className="space-y-9">
          {sections.map((section, index) => (
            <section key={`${section.heading ?? "intro"}-${index}`}>
              {section.heading ? (
                <h2 className="mb-3 text-xl font-bold tracking-[-0.03em] text-foreground">
                  {section.heading}
                </h2>
              ) : null}
              <p className="text-sm leading-relaxed text-foreground/90">{section.body}</p>
            </section>
          ))}
        </div>
      ) : (
        <EmptyNote>This project did not submit a description on Devpost.</EmptyNote>
      )}
    </div>
  );
}
