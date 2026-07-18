# Design: Project Similarity Indexing

Status: **Draft for review** · Owner: —

Goal: for any hackathon project, answer "what projects are similar to this one?"
and surface similarity metrics, grounded in what HackStack already scrapes.

---

## 1. What we have today

From the current data model (see `db/schema/`), each project already carries rich,
embeddable text — no new scraping required:

| Signal | Source column | Kind |
| --- | --- | --- |
| Name | `projects.name` | short text |
| Tagline | `projects.tagline` | short text |
| Story / description | `projects.description` | long text (noisy, promotional) |
| Tech stack | `projects.builtWithData` (jsonb) | tag set — exact-match signal |
| Repo languages / deps | `repository_files.language`, `repository_dependencies` | tag set — exact-match signal |
| Winner / track | `projects.isWinner`, `projects.winningTrack` | facet |
| Hackathon | `projects.hackathonId` | facet |

What is **missing**:

- No `pgvector` extension, no embedding column, no vector index.
- No AI SDK / embedding client installed (`package.json` has no `ai`, `@ai-sdk/*`,
  `openai`, etc.).
- No async job runner — ingestion is a synchronous CLI script
  (`lib/scraper/import-hackathon.ts`), not Trigger.dev.

Implication: this feature is **additive**. It slots into the existing import loop;
it is not a refactor.

---

## 2. Architecture: retrieve → re-rank → explain

Similarity is best served as three composable layers. Each layer is optional and
degrades gracefully — you can ship Layer 1 alone and add the others later.

### Layer 1 — Semantic retrieval (pgvector)

The workhorse. Handles ~80% of "feels similar" with one cheap vector query.

- One embedding vector per project, stored in a new `project_embeddings` table.
- Similarity = cosine distance: `ORDER BY embedding <=> $queryVector LIMIT k`.
- HNSW index keeps it fast as the corpus grows.

### Layer 2 — Structured re-rank (no model calls)

Embeddings *blur* exact tech overlap ("React" and "Vue" sit near each other in
vector space). Correct for it with cheap exact-match signals:

- Jaccard overlap on `builtWithData` tags (and repo languages/deps).
- Facet boosts/filters: same track, same hackathon, winner-only, etc.

Blended score (tunable):

```
score = 0.7 * cosine_similarity + 0.3 * jaccard(tech_tags)
```

This is pure SQL/JS. It also gives free filters — "similar projects that also use
Next.js" — which embeddings alone cannot express precisely.

### Layer 3 — Agentic explanation (LLM, top-k only)

Run an LLM **only on the ~10 candidates that survive Layers 1+2**, never over the
whole corpus. It produces the *why*:

> "Both are RAG-over-PDF tools; this one adds voice input and a Chrome extension."

This is where "agentic" earns its cost, and it fits the product rule that inference
be labeled and separated from evidence: the vector/tag overlap is **evidence**, the
LLM sentence is clearly **inference**.

---

## 3. The key decision: how "agentic" is *indexing*?

Layer 3 is agentic at *query* time regardless. The open question is whether
*indexing* is agentic. Two options:

### Option A — Embed-only indexing

Embed the raw scraped text directly.

```
doc = `${name}\n${tagline}\n\nBuilt with: ${builtWith.join(", ")}\n\n${description}`
```

- **One `embedMany` call per hackathon batch.** No per-project LLM cost.
- Fast to ship, cheap to run, easy to re-embed.
- Weakness: Devpost stories are promotional and inconsistent ("🚀 We poured our
  hearts into..."). Marketing noise leaks into the vector, so two genuinely similar
  tools can drift apart and two dissimilar-but-similarly-hyped ones can pull together.

### Option B — Agent-enriched indexing

Before embedding, an agent reads the project's README + repo signals and writes a
**normalized capability summary** — a terse, factual description of what the project
*does* and *how* — then embeds that instead of raw marketing copy.

```
summary = agent(name, tagline, description, README, languages, deps)
          → "A retrieval-augmented chatbot over user-uploaded PDFs. Next.js
             frontend, FastAPI backend, pgvector store, OpenAI embeddings."
doc = summary
```

- Similarity is computed over **clean signal**, so results are noticeably sharper
  and the same summary doubles as evidence for the judge workspace.
- Cost: **one LLM call per project at index time** + prompt engineering + a place to
  store the summary (`project_embeddings.summary` or a `project_capabilities` table).
- Needs guardrails: the agent must not invent capabilities (product rule —
  `code_supported` vs `claimed_only`). Summary should cite whether each claim came
  from the repo (code-supported) or only the Devpost story (claimed-only).

### Recommendation

Ship **Option A first** (Layer 1 + 2), measure result quality on a few real
hackathons, then layer in **Option B** as an enrichment pass if the raw-text results
feel noisy. Option B reuses all of Option A's plumbing — it only changes *what text
goes into `embedMany`* — so it is not throwaway work. Starting with B risks tuning a
prompt before we know we need it.

---

## 4. Schema changes

New migration `supabase/migrations/<ts>_project_embeddings.sql`:

```sql
create extension if not exists vector;

-- private schema, consistent with github_repositories et al.
create table private.project_embeddings (
  project_id   uuid primary key references public.projects(id) on delete cascade,
  model        text not null,                 -- provenance: which model produced this
  dims         integer not null,
  embedding    vector(1536) not null,         -- match chosen model's dimension
  source_text  text,                          -- doc that was embedded (debug / re-embed)
  summary      text,                          -- Option B: normalized capability summary
  content_hash text not null,                 -- skip re-embed when inputs unchanged
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index project_embeddings_hnsw
  on private.project_embeddings
  using hnsw (embedding vector_cosine_ops);
```

Mirror this in `db/schema/project-embeddings.ts` (Drizzle) and re-export from
`db/schema/index.ts`, per the AGENTS.md rule to keep Drizzle in sync with every SQL
migration. Note: Drizzle needs the `pgvector`-aware column type (custom type or
`drizzle-orm` vector helper).

`content_hash` = hash of the embedding inputs. On re-import, skip projects whose hash
is unchanged — avoids re-embedding the whole corpus every run.

---

## 5. Where it hooks in

- **Embed on ingest:** end of the finalize loop in
  `lib/scraper/import-hackathon.ts`, after `upsertProjects`. Collect the batch's
  docs, one `embedMany` call, upsert into `project_embeddings`.
- **Backfill:** `scripts/embed-projects.ts` (mirrors existing `scripts/scrape-*.ts`)
  to embed everything already scraped. Idempotent via `content_hash`.
- **Query helper:** `lib/data/similar-projects.ts` —
  `getSimilarProjects(projectId, { limit, sameHackathon?, techFilter? })`.
  Runs the pgvector query, applies the Layer-2 blend in SQL or JS, returns ranked
  projects + scores.
- **UI:** a "Similar projects" section on the project page
  (`app/(app)/.../[project]`), each row showing the blended score and shared tech
  chips. Layer-3 explanations can hydrate progressively (server action / streamed).

Because there is no job runner, embeddings run **inline in the CLI import** for now.
If corpus size makes that slow, the same `embedMany` step later moves into Trigger.dev
(already in the stack plan) without changing the schema or query.

---

## 6. Similarity metrics to expose

Beyond a ranked "similar to this" list, the vectors unlock:

- **Nearest-neighbor list** per project (the core feature).
- **Duplicate / near-duplicate detection** — cosine above a threshold flags projects
  that reused the same idea, useful for judges.
- **Cluster / theme view** — cluster the hackathon's vectors (k-means / HDBSCAN) to
  show "12 projects tackled healthcare, 8 did devtools." Feeds the existing
  `lib/insights/` analytics.
- **Tech-adjacency** — from `builtWithData` overlap, independent of embeddings.

---

## 7. Cost & effort sketch

| Item | Option A | Option B |
| --- | --- | --- |
| Migration + Drizzle schema | small | small (same) |
| Embedding client + AI SDK wiring | small | small (same) |
| Index-time cost | 1 `embedMany` / batch | + 1 LLM call / project |
| Enrichment prompt + guardrails | — | medium |
| Query helper + Layer-2 blend | medium | medium (same) |
| UI section | medium | medium (same) |
| Layer-3 explanation (optional) | small add-on | small add-on |

Critical path to a working v1: **migration → embed step → query helper → UI**.
Everything else (Layer 2 blend, Layer 3 explain, Option B enrichment, clustering)
layers on without rework.

---

## 8. Open questions

1. **Embedding model / provider** — via Vercel AI Gateway (`"provider/model"` string)
   per the platform default, or a direct provider package? Picks the vector `dims`.
2. **Corpus scope** — similarity *within* a hackathon only, or *across* all indexed
   hackathons? (Cross-hackathon needs no schema change, just a wider query.)
3. **Where does index-time embedding run** — inline in the CLI now, or wait for the
   Trigger.dev worker the stack plan already calls for?
4. **Threshold tuning** — what cosine cutoff counts as "similar" vs "duplicate"?
   Needs a few real hackathons to calibrate.
