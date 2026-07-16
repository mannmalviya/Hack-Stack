
# HackStack Engineering Guide

## Tech Stack
### Frontend

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui + Radix UI for accessible, composable application primitives
- Lucide React for icons
- Motion (`motion/react`, formerly Framer Motion) for subtle interaction and layout transitions
- Geist or Inter as the UI font; do not use OpenAI Sans or Anthropic’s proprietary typefaces
- `clsx` + `tailwind-merge` + Class Variance Authority for clean component variants
- `next-themes` for system-aware light/dark mode
- `cmdk` for a command palette and fast project navigation
- Sonner for lightweight toast feedback
- React Hook Form + Zod for forms and validation
- React Resizable Panels for the judge workspace: project list, evidence brief, and copilot panes

### Application Backend

- Next.js Route Handlers and Server Actions
- Server Components for authenticated data loading
- Vercel AI SDK for provider-agnostic, structured AI responses
- Octokit for GitHub repository and commit metadata
- Cheerio for bounded Devpost/public-page parsing
- Zod validation for requests, scraped data, GitHub responses, and AI outputs


### Database, Auth, and Storage
- Supabase PostgreSQL
- Drizzle ORM + Drizzle Kit for typed, server-side database queries and schema definitions
- Supabase Auth with email magic links initially; Google OAuth later
- `@supabase/supabase-js` + `@supabase/ssr` for browser/server auth clients and cookie-based sessions
- Supabase Realtime for import and analysis progress
- Supabase CLI migrations in `supabase/migrations`
- Drizzle schema in `db/schema`; update it alongside every SQL migration
- Row Level Security enabled on every exposed table

### Background Jobs
- Trigger.dev for durable import, analysis, and copilot jobs
- Job states: `queued`, `running`, `succeeded`, `partial`, `failed`

### Observability and Quality
- Sentry for application and worker errors
- Vitest for unit and integration tests
- Playwright for end-to-end tests
- ESLint + TypeScript strict mode
- GitHub Actions for lint, test, and production-build checks

### Deployment

- Vercel for the Next.js application
- Supabase for database, auth, storage, and realtime
- Trigger.dev for durable jobs

## Product constraints

- HackStack helps judges inspect hackathon projects; it must never submit, modify, or recommend final judging scores.
- Evidence must be linked to a source and distinguished from inference.
- Use only these verification outcomes: `verified`, `code_supported`, `claimed_only`, and `blocked`.
- Never claim certainty when the demo, repository, or source evidence is unavailable.

## Data and safety

- Persist all scraped Devpost project data for approved hackathons.
- Persist repository URLs, source citations, file/route/component locators, commit SHAs, generated summaries, verification results, and approved screenshots only.
- Do not commit secrets. Keep credentials in `.env.local`; it is ignored by Git.

## Product rules

- Hackathon URLs enter an admin approval queue before indexing.
- Guests may import up to five projects and ask three AI questions per project.
- Signed-in users may import 5, 10, or 20 projects and save notes, comparisons, and conversations.
- GitHub and publicly accessible demos are the only repository/demo sources in v1.
- Full-hackathon indexing, private repositories, billing, collaboration workspaces, and score submission are out of scope.

## Code conventions

- Keep the app as one Next.js App Router project rooted in this repository.
- Prefer Server Components; use Client Components only for browser interaction.
- Keep integrations and domain logic outside page components.
- Use typed boundaries for imports, analysis jobs, evidence, verification runs, and AI-provider responses.
- Put background import, analysis, and browser-verification work in a worker module/package; do not run long jobs in a page request.
- Add concise, human-readable comments where they clarify intent, non-obvious logic, constraints, or tradeoffs; avoid comments that merely restate the code.

## Verification

Run before handing off code:

```bash
npm run lint
npm run build
```

## Commit attribution

- Append `Co-authored-by: Codex <noreply@openai.com>` to every commit created in this repository.
