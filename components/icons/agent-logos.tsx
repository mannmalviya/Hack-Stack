import aiderLogo from "@/public/brand-icons/aider.svg";
import continueLogo from "@/public/brand-icons/continue.svg";
import claudeCodeLogo from "@lobehub/icons-static-svg/icons/claudecode.svg";
import clineLogo from "@lobehub/icons-static-svg/icons/cline.svg";
import codexLogo from "@lobehub/icons-static-svg/icons/codex.svg";
import copilotLogo from "@lobehub/icons-static-svg/icons/copilot.svg";
import cursorLogo from "@lobehub/icons-static-svg/icons/cursor.svg";
import windsurfLogo from "@lobehub/icons-static-svg/icons/windsurf.svg";

import { BrandIcon } from "@/components/icons/brand-icon";
import type { AiCodeAgent } from "@/lib/insights/hackathon-analytics";

const AGENT_LOGOS = {
  "Claude Code": claudeCodeLogo,
  Codex: codexLogo,
  "GitHub Copilot": copilotLogo,
  Cursor: cursorLogo,
  Windsurf: windsurfLogo,
  Cline: clineLogo,
  Aider: aiderLogo,
  Continue: continueLogo,
} satisfies Record<AiCodeAgent, string | { src: string }>;

export function AgentLogo({ agent, className }: { agent: AiCodeAgent; className?: string }) {
  return <BrandIcon src={AGENT_LOGOS[agent]} className={className} />;
}
