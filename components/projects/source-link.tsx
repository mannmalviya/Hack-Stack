import { SiDevpost, SiGithub } from "@icons-pack/react-simple-icons";

const ICONS = { github: SiGithub, devpost: SiDevpost } as const;

const LABELS = {
  github: "Open repository on GitHub",
  devpost: "Open submission on Devpost",
} as const;

type SourceLinkProps = {
  source: keyof typeof ICONS;
  href: string;
  size?: number;
  className?: string;
};

/** Icon link out to wherever a panel's content was sourced from. */
export function SourceLink({ source, href, size = 22, className }: SourceLinkProps) {
  const Icon = ICONS[source];
  const label = LABELS[source];

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${className ?? ""}`}
    >
      <Icon size={size} />
    </a>
  );
}
