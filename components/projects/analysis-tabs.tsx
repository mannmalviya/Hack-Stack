import { MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";

import { ArchitecturePanel } from "@/components/projects/architecture-panel";
import { PaneTabs } from "@/components/projects/pane-tabs";
import type { ProjectArchitecture } from "@/lib/architecture/project-architecture";

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
 *   (lib/github/readme.ts), per-project evidence (lib/data/project-evidence.ts)
 *   and now the indexed file structure (lib/architecture/project-architecture.ts).
 */
function AiChatPanel() {
  return (
    <div className="p-5">
      <div className="border border-border bg-surface px-6 py-16 text-center">
        <MessagesSquare
          size={20}
          aria-hidden="true"
          className="mx-auto text-muted"
        />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Coming soon
        </p>
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted">
          You will be able to ask questions about this project and get answers cited back
          to the submission, the readme and the indexed code.
        </p>
      </div>
    </div>
  );
}

export function AnalysisTabs({
  architecture,
  hasGithubUrl,
  team,
}: {
  architecture: ProjectArchitecture | null;
  hasGithubUrl: boolean;
  /** Rendered by the page: the team stats own their own data source. */
  team: ReactNode;
}) {
  return (
    <PaneTabs
      ariaLabel="Analysis view"
      idPrefix="analysis"
      tabs={[
        { id: "team", label: "Team", content: team },
        {
          id: "architecture",
          label: "Architecture",
          content: (
            <ArchitecturePanel architecture={architecture} hasGithubUrl={hasGithubUrl} />
          ),
        },
        { id: "chat", label: "AI Chat", content: <AiChatPanel /> },
      ]}
    />
  );
}
