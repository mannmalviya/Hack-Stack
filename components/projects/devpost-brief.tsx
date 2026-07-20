import { splitDevpostDescription } from "@/lib/devpost/description";

type DevpostBriefProps = {
  name: string;
  videoUrl: string | null;
  description: string | null;
};

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
      {children}
    </p>
  );
}

export function DevpostBrief({ name, videoUrl, description }: DevpostBriefProps) {
  const sections = description ? splitDevpostDescription(description, name) : [];

  return (
    <div className="space-y-8 p-5">
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">{name}</h1>

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
