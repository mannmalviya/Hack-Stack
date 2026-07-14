export type HackathonStatus = "open" | "judging" | "completed";
export type HackathonLocation = "online" | "in-person" | "hybrid";
export type HackathonLength = "week" | "month" | "extended";

export type Hackathon = {
  slug: string;
  name: string;
  organizer: string;
  description: string;
  startsAt: string;
  endsAt: string;
  projectCount: number;
  status: HackathonStatus;
  location: HackathonLocation;
  length: HackathonLength;
  tags: string[];
  accent: string;
  initials: string;
};

// Temporary fixture data. Keep the shape aligned with the eventual Supabase row mapper.
export const hackathons: Hackathon[] = [
  {
    slug: "global-ai-hackathon-2026",
    name: "Global AI Hackathon",
    organizer: "AI Collective",
    description: "Applied AI projects tackling practical problems in health, work, and education.",
    startsAt: "2026-06-12",
    endsAt: "2026-06-28",
    projectCount: 184,
    status: "judging",
    location: "online",
    length: "month",
    tags: ["Machine Learning/AI", "Social Good", "Education"],
    accent: "#7567f8",
    initials: "GA",
  },
  {
    slug: "climate-tech-build",
    name: "Climate Tech Build",
    organizer: "Earth Systems Lab",
    description: "Open-source tools for climate resilience, energy, and more sustainable cities.",
    startsAt: "2026-07-18",
    endsAt: "2026-08-02",
    projectCount: 96,
    status: "open",
    location: "hybrid",
    length: "month",
    tags: ["Climate", "Social Good", "Open Source"],
    accent: "#1aa981",
    initials: "CT",
  },
  {
    slug: "agentic-commerce",
    name: "Agentic Commerce",
    organizer: "Builders Guild",
    description: "New shopping and operations experiences built with autonomous software agents.",
    startsAt: "2026-05-03",
    endsAt: "2026-05-17",
    projectCount: 132,
    status: "completed",
    location: "online",
    length: "month",
    tags: ["Machine Learning/AI", "Commerce", "Productivity"],
    accent: "#ef7a45",
    initials: "AC",
  },
  {
    slug: "open-source-sprint",
    name: "Open Source Sprint",
    organizer: "Code Commons",
    description: "A community sprint for developer tools, infrastructure, and public-interest software.",
    startsAt: "2026-07-22",
    endsAt: "2026-08-09",
    projectCount: 71,
    status: "open",
    location: "online",
    length: "month",
    tags: ["Open Source", "Developer Tools", "Beginner Friendly"],
    accent: "#3189d8",
    initials: "OS",
  },
  {
    slug: "health-forward",
    name: "Health Forward",
    organizer: "CareTech Foundation",
    description: "Human-centered technology that improves access, prevention, and patient outcomes.",
    startsAt: "2026-04-11",
    endsAt: "2026-04-26",
    projectCount: 109,
    status: "completed",
    location: "in-person",
    length: "month",
    tags: ["Health", "Social Good", "Beginner Friendly"],
    accent: "#e25276",
    initials: "HF",
  },
  {
    slug: "future-of-learning",
    name: "Future of Learning",
    organizer: "Learning Lab",
    description: "Experiments in personalized education, creative learning, and accessible classrooms.",
    startsAt: "2026-06-20",
    endsAt: "2026-07-05",
    projectCount: 143,
    status: "judging",
    location: "hybrid",
    length: "month",
    tags: ["Education", "Machine Learning/AI", "Web"],
    accent: "#d39b27",
    initials: "FL",
  },
];
