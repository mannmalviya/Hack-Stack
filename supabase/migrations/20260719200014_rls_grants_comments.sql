-- Custom SQL migration file, put your code below! --

-- Extracted ground-truth SQL (2026-07-19) for everything the current db/schema/*.ts
-- cannot express: table/column comments, grants, RLS policy, Realtime publication.
-- Pulled by querying the local DB after replaying all 15 legacy migrations, not by
-- hand-merging the .sql files (some constraints/comments were redefined more than once
-- across files, e.g. hackathons_indexing_stage_check and the hackathon_requests ->
-- indexing_requests rename, so the live DB was the only reliable source of the FINAL state).

-- Table comments
comment on table private.github_repositories is 'Canonical metadata for GitHub repositories validated by HackStack. Repository identity is based on GitHub''s stable numeric and node identifiers rather than its mutable owner/name.';
comment on table private.hacker_contributor_metrics is 'Commit, addition, and deletion totals fully credited to GitHub-resolved contributors within a project and insight run.';
comment on table private.hacker_insight_runs is 'Atomic calculation snapshots for hackathon-level Hacker Insights.';
comment on table private.hacker_team_metrics is 'Commit, addition, and deletion totals aggregated once per Devpost project and insight run.';
comment on table private.project_embedding_sources is 'Devpost Inspiration and What it does sections eligible for project similarity indexing.';
comment on table private.project_repositories is 'Links imported Devpost projects to their canonical GitHub repositories.';
comment on table private.repository_commit_authors is 'Ordered primary and co-author identities returned by GitHub for each stored commit.';
comment on table private.repository_commits is 'Stores unique Git commits discovered for each project repository link.';
comment on table private.repository_dependencies is 'Stores dependencies extracted from repository manifests for technology analysis.';
comment on table private.repository_files is 'Stores current file metadata for each indexed project repository without source contents.';
comment on table private.repository_ingestion_runs is 'Tracks each GitHub ingestion attempt for a project repository link.';
comment on table public.hackathons is 'Stores approved Devpost hackathons indexed by HackStack, including source details, event metadata, project count, current indexing status, and import timestamps.';
comment on table public.indexing_requests is 'User-owned Devpost indexing requests. Hackathons await admin approval; projects queue immediately.';
comment on table public.projects is 'Stores imported hackathon project submissions from Devpost, including their hackathon association, external identifiers, project details, demo/video/GitHub links, team members, technologies used, and raw source-capture metadata for traceability and verification.';

-- Column comments
comment on column private.github_repositories.api_etag is 'Most recent GitHub repository API ETag, retained for conditional metadata refreshes.';
comment on column private.github_repositories.metadata_fetched_at is 'Time when HackStack most recently fetched this repository metadata from GitHub.';
comment on column public.hackathons.cover_image_source_url is 'Original Devpost CDN URL retained as source provenance for the hackathon cover.';
comment on column public.hackathons.cover_image_path is 'Object path for HackStack''s copy in the public hackathon-covers Storage bucket.';
comment on column public.hackathons.cover_image_fetched_at is 'Time when the current Storage copy of the hackathon cover was downloaded.';
comment on column public.hackathons.indexing_stage is 'Current Devpost or GitHub phase while indexing_status is running.';
comment on column public.hackathons.indexing_progress_completed is 'Number of items completed in the current indexing stage.';
comment on column public.hackathons.indexing_progress_total is 'Expected number of items in the current indexing stage when known.';
comment on column public.projects.cover_image_source_url is 'Original Devpost CDN URL retained as source provenance for the project cover.';
comment on column public.projects.cover_image_path is 'Object path for HackStack''s copy in the public project-covers Storage bucket.';
comment on column public.projects.cover_image_fetched_at is 'Time when the current Storage copy of the project cover was downloaded.';
comment on column public.projects.ingestion_completed_at is 'Set only after the complete Devpost, cover, and optional GitHub pipeline succeeds. Null rows are incomplete and must be processed from the beginning.';
comment on column public.projects.ingestion_status is 'Outcome of the most recent import attempt: pending, succeeded, partial, or failed. failed rows are kept for manual review and retried on the next import; succeeded/partial rows are complete.';
comment on column public.projects.ingestion_error is 'Human-readable reason a project ingestion failed or was partial, surfaced in hackathon insights for manual review.';

-- Foreign key to Supabase's protected auth schema. Deliberately not declared in
-- db/schema/indexing-requests.ts (see the comment above indexingRequests' check
-- constraints) so drizzle-kit never tries to manage the auth schema. Owned here instead.
alter table public.indexing_requests
  add constraint indexing_requests_submitted_by_fkey
  foreign key (submitted_by) references auth.users (id) on delete cascade;

-- Grants
-- Note: these REFERENCES/TRIGGER/TRUNCATE grants to anon/authenticated on public.hackathons
-- and public.projects look like Supabase Studio's default table-creation grants rather than
-- anything intentionally load-bearing (both tables are read only server-side via Drizzle,
-- which connects as postgres and bypasses grants/RLS entirely -- see DEPLOYMENT.md). Carried
-- over as-is to keep behavior identical; reconsider dropping them separately if unwanted.
grant references, trigger, truncate on public.hackathons to anon;
grant references, trigger, truncate on public.hackathons to authenticated;
grant references, trigger, truncate on public.hackathons to service_role;
grant references, trigger, truncate on public.projects to anon;
grant references, trigger, truncate on public.projects to authenticated;
grant references, trigger, truncate on public.projects to service_role;
grant select on public.indexing_requests to authenticated;
grant all on public.indexing_requests to service_role;

-- RLS policy
create policy "Users can read their indexing requests" on public.indexing_requests
  for select to authenticated
  using ((select auth.uid()) = submitted_by);

-- Realtime publication (idempotent guard recommended since supabase_realtime may already
-- contain this table on a re-run; the original migration used a DO block for this reason --
-- consider using: do $$ begin
--   if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
--     and schemaname = 'public' and tablename = 'indexing_requests') then
--     alter publication supabase_realtime add table public.indexing_requests;
--   end if;
-- end $$;
alter publication supabase_realtime add table public.indexing_requests;