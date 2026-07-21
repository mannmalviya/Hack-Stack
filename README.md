![Hack Stack](hackstack-github-banner.png)

# Hack Stack

Hack Stack indexes hackathon projects and sends a coding agent into each repo to check whether the project actually does what it claims.

Hackathon judges never see the code. They get a demo video and a README, and that's it, while the actual implementation (often tens of thousands of agent-generated lines shipped in a weekend) stays completely abstracted away. Discovery is just as broken: unless a project has a winner tag, it drowns in an ocean of submissions.

Hack Stack fixes both. It scrapes every submitted project in an approved hackathon, ingests the linked repos, and runs an agent over the code to:

- **Verify claims.** Extract the list of features claimed in the Devpost submission and README, then explore the actual code to confirm each one. Every result is tagged `verified`, `code_supported`, `claimed_only`, or `blocked`, and each `verified` feature is backed by a real file citation that has to exist in the clone.
- **Gather analytics.** Profile hackathons and hackers: technologies, libraries and frameworks, coding agents used, commit counts, and lines added/deleted.
- **Export to your own agent.** Drop any indexed project straight into your local coding agent to dig in further.
- **Make discovery effortless.** Browse every project, its stack, and its verified evidence in one place.

## How it works

The core is an ingestion and analysis pipeline. Everything starts from an approved Devpost hackathon URL and fans out per project.

### 1. Ingestion

`lib/devpost` and `lib/scraper` walk a hackathon's Devpost gallery, following pagination until every public submission is discovered. For each project it pulls the detail page (description, authors, technologies, links), downloads and validates the cover image into Supabase Storage, and persists the gallery data.

`lib/github` then ingests each linked repository with Octokit: canonical repo metadata, commit history and per-contributor counts, current file metadata, and dependencies parsed from npm, Python, Cargo, and Go manifests. Repository source contents are never persisted, only metadata and citations.

The importer is incremental. On a rerun it skips projects whose Devpost and GitHub data were already stored successfully and only reprocesses new or previously failed ones. A project is persisted only when its detail page, cover handling, and GitHub ingestion all succeed.

### 2. Verification

This is the part that reads the code. `lib/verification` clones a project's repo into a temp directory and runs a coding agent (`claude -p` in print mode) inside it, restricted to read-only tools (`Read`, `Grep`, `Glob`) so it can inspect the clone but never mutate it. The agent gets the claimed-feature list built from the submission and README, explores the code to check each one, and returns structured JSON.

Guardrails keep the output honest:

- Every citation is checked against the clone. A cited path that doesn't exist (or escapes the clone directory) is dropped.
- A `verified` feature left with no real evidence is downgraded to `code_supported`.
- Each run has a hard timeout and a per-project dollar ceiling, so one runaway repo can't drain the budget. It fails and the batch moves on.

### 3. Analytics and export

`lib/insights` rolls individual project data up into hackathon-wide and per-hacker analytics. `lib/architecture` derives a project's architectural layers. `lib/ai` builds the context bundle used to export a project into your own local agent.

### Orchestration

Long jobs never run in a page request. The `trigger/` tasks (`index-devpost-hackathon`, `index-devpost-project`) run the pipeline on [Trigger.dev](https://trigger.dev), one durable, independently managed job per project, with retries and live progress. Hackathon indexing is serialized through a concurrency-limited queue to keep compute bounded.

## Stack

- **Frontend** — Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui + Radix, Motion
- **Backend** — Next.js Route Handlers and Server Actions, Server Components for authenticated data loading
- **Database** — Supabase Postgres with Drizzle ORM; `db/schema/*.ts` is the single source of truth, migrations are generated from it and reviewed by hand
- **Ingestion** — Octokit (GitHub), Cheerio (Devpost), Zod at every boundary
- **Jobs** — Trigger.dev for durable import, analysis, and verification
- **Deploy** — Vercel (app) + Supabase (db, auth, storage, realtime)

## Getting started

```bash
npm install
```

Set `DATABASE_URL`, `SUPABASE_URL`, a server-only `SUPABASE_SECRET_KEY`, and a server-only `GITHUB_TOKEN` in `.env.local`. The GitHub token needs read access to repository metadata and contents. For local Supabase, use `SUPABASE_SERVICE_ROLE_KEY` instead of the hosted secret key (`supabase status` prints the local value).

```bash
npm run dev          # start the app
npm run trigger:dev  # start the Trigger.dev worker
```

### Import a hackathon from the CLI

```bash
npm run scrape:hackathon -- https://example-hackathon.devpost.com/ --limit all
```

`--limit` must be `5`, `10`, `20`, or `all` (default `all`). The command is incremental: it re-walks the gallery, skips already-stored projects, and runs the full pipeline only for new or previously failed ones.

### Verify a single project's features

```bash
npm run verify:features
```

### Scrape one public project to JSON (no DB writes)

```bash
npm run scrape:devpost -- https://devpost.com/software/project-name ./tmp/project.json
```

Only crawl public Devpost pages, and respect Devpost's terms and rate limits.

## Verification and safety rules

- Evidence is always linked to a source and kept distinct from inference.
- Outcomes are limited to `verified`, `code_supported`, `claimed_only`, and `blocked`.
- Hack Stack never submits, modifies, or recommends judging scores.
- No certainty is claimed when the demo, repository, or source evidence is unavailable.
- Only GitHub repositories and publicly accessible demos are used as sources.

## Development

```bash
npm run lint
npm run build
npm test
```

Database work goes through Drizzle: edit `db/schema/*.ts`, run `npm run db:generate`, read the generated SQL, and verify locally with `supabase db reset` before pushing. Never hand-edit files in `supabase/migrations/`.
