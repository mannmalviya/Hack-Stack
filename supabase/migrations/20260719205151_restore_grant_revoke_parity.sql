-- Custom SQL migration file, put your code below! --

-- The 2026-07-19 migration-history rebuild (20260719200002_initial_schema.sql /
-- 20260719200014_rls_grants_comments.sql) reconstructed grants/RLS from a live-DB
-- snapshot and silently dropped a few defense-in-depth statements the original,
-- hand-written migrations had. This migration restores them.

-- 1. Explicit REVOKE before GRANT on public.indexing_requests. Supabase auto-grants
--    default table privileges to anon/authenticated on new public-schema tables;
--    without this revoke, indexing_requests relied on RLS alone instead of both the
--    grant layer and RLS to block anon reads and authenticated direct writes.
revoke all on table public.indexing_requests from anon, authenticated;
grant select on table public.indexing_requests to authenticated;
grant all on table public.indexing_requests to service_role;

-- 2. Fail-fast assertion that used to guard this exact class of grant drift.
do $$
begin
  if not has_table_privilege('authenticated', 'public.indexing_requests', 'select') then
    raise exception 'authenticated role is missing indexing request select access';
  end if;
  if has_table_privilege('authenticated', 'public.indexing_requests', 'insert') then
    raise exception 'authenticated role must not insert indexing requests directly';
  end if;
end
$$;

-- 3. REVOKEs on the private schema and its tables/sequences. Postgres doesn't
--    auto-grant on custom schemas and `private` isn't in config.toml's exposed
--    API schemas, so this is likely a no-op today -- but DEPLOYMENT.md documents
--    these 11 objects as safe specifically because their grants are revoked, and
--    that invariant should be established by a migration, not left implicit.
revoke all on schema private from public, anon, authenticated;

revoke all on table private.github_repositories from public, anon, authenticated;
revoke all on sequence private.github_repositories_id_seq from public, anon, authenticated;

revoke all on table private.project_repositories from public, anon, authenticated;
revoke all on sequence private.project_repositories_id_seq from public, anon, authenticated;

revoke all on table private.repository_ingestion_runs from public, anon, authenticated;
revoke all on sequence private.repository_ingestion_runs_id_seq from public, anon, authenticated;

revoke all on table private.repository_commits from public, anon, authenticated;
revoke all on sequence private.repository_commits_id_seq from public, anon, authenticated;

revoke all on table private.repository_files from public, anon, authenticated;
revoke all on sequence private.repository_files_id_seq from public, anon, authenticated;

revoke all on table private.repository_dependencies from public, anon, authenticated;
revoke all on sequence private.repository_dependencies_id_seq from public, anon, authenticated;

revoke all on table private.repository_commit_authors from anon, authenticated;

revoke all on table private.hacker_insight_runs from anon, authenticated;
revoke all on sequence private.hacker_insight_runs_id_seq from anon, authenticated;
revoke all on table private.hacker_team_metrics from anon, authenticated;
revoke all on table private.hacker_contributor_metrics from anon, authenticated;

revoke all on table private.project_embedding_sources from public, anon, authenticated;

-- 4. Restore the MAINTAIN grant on hackathons/projects that the rebuild dropped
--    while its own comment claimed exact parity with the prior state.
grant maintain on public.hackathons to anon, authenticated, service_role;
grant maintain on public.projects to anon, authenticated, service_role;
