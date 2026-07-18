# HackStack MVP Plan

## Summary

Build a Next.js + TypeScript judge-review web app for an admin-curated, Devpost-based hackathon catalog. Users can submit hackathon or project URLs; approved hackathons import their full public gallery while project URLs immediately add that project to its parent hackathon page. HackStack produces evidence-grounded briefs, runs calibrated feature checks, and supports judge questions without ever submitting scores.

Guests can browse and ask up to three AI questions per project. Passwordless accounts unlock saved imports, notes, comparisons, and unlimited copilot use.

## Key Changes

- Create a Postgres-backed application with:
  - Public hackathon catalog, project pages, Claim Ledger, evidence briefs, comparisons, and guest sessions.
  - Admin role for approving/rejecting hackathon import requests and starting imports.
  - Passwordless email authentication; signed-in users own imports, notes, conversations, and verification runs.
  - Provider-agnostic `AIProvider` interface; configure the initial model provider through environment variables and require structured JSON responses.

- Implement the Devpost import workflow:
  - Users submit one Devpost hackathon/gallery or project URL. Hackathons remain pending until admin approval and then index every discoverable project; individual projects queue immediately.
  - Guests may import 10 individual projects and keep 5 hackathon requests pending. Signed-up users have unlimited submissions.
  - Scrape and persist all available Devpost project-card data: title, description, tags, team metadata, demo/video links, and repository links.
  - Store repository URLs and evidence citations only—never persist repository clones or source files.

- Implement asynchronous analysis jobs:
  - On import, fetch public repository metadata, README, dependency manifests, commit metadata, and reachable public demo URLs within strict timeout/size limits.
  - Analyze source transiently, then persist only claim conclusions, architecture/setup summaries, risks, evidence source URLs, file paths, route/component/dependency references, commit SHA where available, and timestamps.
  - Produce an Evidence Brief with claims, status, technical architecture, setup/testability, risks, unanswered questions, and citation-backed evidence.
  - Normalize claim status as `verified`, `code_supported`, `claimed_only`, or `blocked`; show `code_supported` as “Partial” in the Claim Ledger where appropriate.

- Build the Claim Ledger and judge copilot:
  - Each claim shows the claim text, linked evidence, calibrated status, and a concrete follow-up question/test.
  - Support project-specific questions, three-project implementation-depth comparisons, interview-question generation, rubric-evidence gaps, and draft-only judge notes.
  - Never generate, submit, or modify a final score; responses must distinguish observation from inference and link supporting evidence.
  - Enforce the guest limit of three copilot questions per project using a browser-bound session counter; require sign-in thereafter.

- Build feature verification:
  - Convert a selected project claim into a stated acceptance flow.
  - Inspect the linked repository transiently, then use Playwright against reachable public demos.
  - Capture screenshots and step-level outcomes for the run; persist screenshots, run metadata, and citations—not cloned code.
  - Return only: Verified (tested flow works), Code-supported (implementation found but live test unavailable), Claimed only (no strong support), or Blocked (credentials, unavailable deployment, unsafe flow, timeout, etc.).
  - Never bypass authentication, paywalls, CAPTCHAs, destructive actions, or user-provided credentials.

- Add research/novelty assistance:
  - Search public web and open-source sources for comparable projects/products.
  - Present similarities, differentiators, and suggested interview questions; explicitly label this as research support, not an originality determination.

## Interfaces and Data

- Expose typed server endpoints/actions for indexing requests, admin approval, full-gallery imports, project briefs, verification runs, notes, comparisons, and chat.
- Use durable job records with `queued`, `running`, `succeeded`, `partial`, and `failed` states so imports and analyses can resume and report per-project failure reasons.
- Treat evidence as structured citations: source kind, external URL, repository revision if known, locator (file/route/component/dependency), summary, captured-at time, and confidence.
- Integrate available Devpost connector metadata—especially hackathon overview and judging criteria—when available; use the bounded public-gallery ingestion layer for the project-card data the connector does not expose.

## Test Plan

- Unit-test import limits, guest quota enforcement, claim-status normalization, evidence-citation validation, and no-score guardrails.
- Integration-test the approval queue, guest submission quotas, full-gallery and targeted-project imports, durable job lifecycle, Devpost field normalization, and account-owned notes/conversations.
- Use fixtures for Devpost pages, GitHub repositories, and public-demo outcomes; verify no repository checkout or source file is persisted.
- Playwright-test successful verification, unreachable demo, credential-required demo, timeout, and screenshot persistence.
- Acceptance test: a judge can inspect an approved hackathon, open a project’s Claim Ledger, ask evidence-backed questions, run a feature verification, compare up to three projects, and save notes after signing in.

## Assumptions

- The launch catalog is controlled through an admin approval queue; unapproved Devpost URLs are never automatically indexed.
- Initial repository support is GitHub only; public demo testing is enabled where safe.
- Analysis runs immediately after import and can be manually refreshed.
- V1 is desktop-first and does not include billing, collaboration workspaces, score submission, or private-repository access.
