import { Bot } from "lucide-react";

import type { AiCodeAgent } from "@/lib/insights/hackathon-analytics";

type IconProps = React.SVGProps<SVGSVGElement>;

// Simplified geometric brand marks, drawn to share one stroke weight so the
// set stays coherent at ~14px. Monochrome (currentColor) keeps them legible
// in both themes.
function StrokeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Claude sunburst. */
function ClaudeCodeLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      {Array.from({ length: 12 }, (_, index) => (
        <line
          key={index}
          x1="12"
          y1="8"
          x2="12"
          y2="3.5"
          transform={`rotate(${index * 30} 12 12)`}
        />
      ))}
    </StrokeIcon>
  );
}

/** OpenAI blossom. */
function CodexLogo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

/** Copilot goggles. */
function GithubCopilotLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 11.7c0-4 3.2-6.2 8-6.2s8 2.2 8 6.2v3.4c0 .7-.36 1.34-.95 1.7l-5.5 3.4a3 3 0 0 1-3.1 0l-5.5-3.4A2 2 0 0 1 4 15.1Z" />
      <path d="M9.3 11.3v2.6" />
      <path d="M14.7 11.3v2.6" />
    </StrokeIcon>
  );
}

/** Cursor isometric cube. */
function CursorLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" />
      <path d="M12 12l7.8-4.5M12 12v9M12 12L4.2 7.5" />
    </StrokeIcon>
  );
}

/** Windsurf stacked sails. */
function WindsurfLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 5.5l16 2.5" />
      <path d="M7.5 11.2l12.5 2" />
      <path d="M11 16.9l9 1.4" />
    </StrokeIcon>
  );
}

/** Cline robot head. */
function ClineLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="6" y="7.5" width="12" height="9.5" rx="2" />
      <path d="M10 11.5v1.6" />
      <path d="M14 11.5v1.6" />
      <path d="M3 11.5v2" />
      <path d="M21 11.5v2" />
    </StrokeIcon>
  );
}

/** Aider terminal prompt. */
function AiderLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 7l6 5-6 5" />
      <path d="M13.5 17H19" />
    </StrokeIcon>
  );
}

/** Continue double chevron. */
function ContinueLogo(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 5.5l6.5 6.5L6 18.5" />
      <path d="M13.5 5.5L20 12l-6.5 6.5" />
    </StrokeIcon>
  );
}

const AGENT_LOGOS: Record<AiCodeAgent, React.ComponentType<IconProps>> = {
  "Claude Code": ClaudeCodeLogo,
  Codex: CodexLogo,
  "GitHub Copilot": GithubCopilotLogo,
  Cursor: CursorLogo,
  Windsurf: WindsurfLogo,
  Cline: ClineLogo,
  Aider: AiderLogo,
  Continue: ContinueLogo,
};

export function AgentLogo({ agent, ...props }: { agent: AiCodeAgent } & IconProps) {
  // Fallback guards against stale data with an agent name we no longer know.
  const Logo = AGENT_LOGOS[agent] ?? Bot;
  return <Logo aria-hidden="true" {...props} />;
}
