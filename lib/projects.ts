export type VerificationOutcome = "verified" | "code_supported" | "claimed_only" | "blocked";

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  outcome: VerificationOutcome;
  evidenceCount: number;
  language: string;
  hasRepository: boolean;
  hasDemo: boolean;
  accent: string;
};

const sharedProjects: Project[] = [
  {
    slug: "astracare",
    name: "AstraCare",
    tagline: "An AI care navigator that turns fragmented health information into a clear next step.",
    category: "Health AI",
    outcome: "verified",
    evidenceCount: 12,
    language: "TypeScript",
    hasRepository: true,
    hasDemo: true,
    accent: "#38bdf8",
  },
  {
    slug: "orbitops",
    name: "OrbitOps",
    tagline: "A multi-agent control room for understanding and automating complex team operations.",
    category: "Agents",
    outcome: "code_supported",
    evidenceCount: 9,
    language: "Python",
    hasRepository: true,
    hasDemo: false,
    accent: "#a78bfa",
  },
  {
    slug: "lumen-notes",
    name: "Lumen Notes",
    tagline: "A visual research notebook that maps sources, arguments, and unanswered questions.",
    category: "Productivity",
    outcome: "verified",
    evidenceCount: 15,
    language: "TypeScript",
    hasRepository: true,
    hasDemo: true,
    accent: "#fbbf24",
  },
  {
    slug: "relay",
    name: "Relay",
    tagline: "Accessible live translation designed for fast-moving community events and workshops.",
    category: "Accessibility",
    outcome: "claimed_only",
    evidenceCount: 4,
    language: "Kotlin",
    hasRepository: false,
    hasDemo: true,
    accent: "#fb7185",
  },
  {
    slug: "signal-garden",
    name: "Signal Garden",
    tagline: "An observability layer that makes distributed systems easier to inspect and explain.",
    category: "Developer Tools",
    outcome: "code_supported",
    evidenceCount: 11,
    language: "Go",
    hasRepository: true,
    hasDemo: true,
    accent: "#34d399",
  },
  {
    slug: "northstar",
    name: "Northstar",
    tagline: "A learning companion that maps curiosity into personal, evidence-backed study paths.",
    category: "Education",
    outcome: "blocked",
    evidenceCount: 3,
    language: "Python",
    hasRepository: true,
    hasDemo: false,
    accent: "#f472b6",
  },
];

export const projectsByHackathon: Record<string, Project[]> = {
  "global-ai-hackathon-2026": sharedProjects,
  "climate-tech-build": [
    { ...sharedProjects[4], slug: "terratrace", name: "TerraTrace", category: "Climate", tagline: "Neighborhood-scale climate intelligence for communities planning around extreme heat." },
    { ...sharedProjects[2], slug: "gridwise", name: "Gridwise", category: "Energy", tagline: "Forecasting tools for resilient community energy networks." },
    { ...sharedProjects[0], slug: "waterline", name: "Waterline", category: "Civic Tech", tagline: "Open flood-risk maps built from public and community observations." },
    { ...sharedProjects[3], slug: "second-cycle", name: "Second Cycle", category: "Circular Economy", tagline: "A local exchange for reusable construction materials." },
  ],
  "agentic-commerce": sharedProjects.slice(0, 5),
  "open-source-sprint": sharedProjects.slice(1),
  "health-forward": sharedProjects.slice(0, 4),
  "future-of-learning": sharedProjects.slice(2),
};

export function getProjectsForHackathon(slug: string) {
  return projectsByHackathon[slug] ?? sharedProjects;
}
