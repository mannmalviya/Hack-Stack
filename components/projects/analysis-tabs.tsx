import { ExportContextButton } from "@/components/projects/export-context-button";
import { PaneTabs } from "@/components/projects/pane-tabs";

function Scaffold({ title, note }: { title: string; note: string }) {
  return (
    <div className="p-5">
      <div className="border border-dashed border-border px-6 py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{title}</p>
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted">{note}</p>
      </div>
    </div>
  );
}

/*
 * TODO(ai-chat): Not implemented — owned by a teammate.
 *
 * This is the per-project AI question-and-answer pane. Notes for whoever picks
 * it up:
 * - Product rule (AGENTS.md): guests get three AI questions per project;
 *   signed-in users are unlimited and can save conversations.
 * - Answers must cite their source and distinguish evidence from inference,
 *   using only the outcomes: verified, code_supported, claimed_only, blocked.
 * - Long-running generation belongs in a worker, not a page request. The repo
 *   already has Trigger.dev wired up; see the `trigger-authoring-chat-agent`
 *   skill and `trigger/` for the chat.agent pattern.
 * - Context worth feeding it is already queried elsewhere: the Devpost
 *   description sections (lib/devpost/description.ts), the README
 *   (lib/github/readme.ts), and per-project evidence
 *   (lib/data/project-evidence.ts).
 */
function AiChatPanel({
  hackathonSlug,
  projectSlug,
}: {
  hackathonSlug: string;
  projectSlug: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-xs leading-relaxed text-muted">
          Export this project&apos;s context (description, README, evidence, key
          source files) to chat with an AI agent elsewhere.
        </p>
        <ExportContextButton
          hackathonSlug={hackathonSlug}
          projectSlug={projectSlug}
        />
      </div>
      <Scaffold
        title="AI Chat"
        note="Not implemented yet. See the TODO in components/projects/analysis-tabs.tsx for the intended scope."
      />
    </div>
  );
}

/*
 * TODO(architecture): Scaffolding only — to be built on a separate branch.
 *
 * Intended to visualise how the project is actually put together: entry points,
 * routes/components, and dependency relationships. The data to build on already
 * exists and is unused by any UI:
 * - private.repository_files (path, language, size) — the file tree
 * - private.repository_dependencies (ecosystem, package, kind, manifest path)
 * - lib/insights/hackathon-analytics.ts for language/technology normalisation
 * Nothing here is wired to a query yet, deliberately.
 */
function ArchitecturePanel() {
  return (
    <Scaffold
      title="Architecture"
      note="Scaffolding only. Implementation is planned on a separate branch; see the TODO in components/projects/analysis-tabs.tsx."
    />
  );
}

export function AnalysisTabs({
  hackathonSlug,
  projectSlug,
}: {
  hackathonSlug: string;
  projectSlug: string;
}) {
  return (
    <PaneTabs
      ariaLabel="Analysis view"
      idPrefix="analysis"
      tabs={[
        {
          id: "chat",
          label: "AI Chat",
          content: (
            <AiChatPanel
              hackathonSlug={hackathonSlug}
              projectSlug={projectSlug}
            />
          ),
        },
        { id: "architecture", label: "Architecture", content: <ArchitecturePanel /> },
      ]}
    />
  );
}
