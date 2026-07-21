import { ExportContextButton } from "@/components/projects/export-context-button";
import { PaneTabs } from "@/components/projects/pane-tabs";
import type { ReactNode } from "react";

import { ArchitecturePanel } from "@/components/projects/architecture-panel";
import { FeatureVerificationPanel } from "@/components/projects/feature-verification-panel";
import type { ProjectArchitecture } from "@/lib/architecture/project-architecture";
import type { FeatureVerificationReport } from "@/lib/data/feature-verification";

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
    </div>
  );
}

export function AnalysisTabs({
  architecture,
  hasGithubUrl,
  featureVerification,
  team,
  hackathonSlug,
  projectSlug,
}: {
  architecture: ProjectArchitecture | null;
  hasGithubUrl: boolean;
  featureVerification: FeatureVerificationReport | null;
  /** Rendered by the page: the team stats own their own data source. */
  team: ReactNode;
  hackathonSlug: string;
  projectSlug: string;
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
        {
          id: "features",
          label: "Features",
          content: <FeatureVerificationPanel report={featureVerification} />,
        },
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
      ]}
    />
  );
}
