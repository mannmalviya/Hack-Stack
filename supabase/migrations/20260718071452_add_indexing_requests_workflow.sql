begin;

-- Generalize the authenticated request table introduced in the preceding
-- migration so one status stream can represent approval and indexing work.
alter table public.hackathon_requests rename to indexing_requests;
alter table public.indexing_requests rename column request_kind to source_type;
alter table public.indexing_requests rename column approved_hackathon_id to hackathon_id;
alter table public.indexing_requests rename column approved_project_id to project_id;

alter table public.indexing_requests
  rename constraint hackathon_requests_pkey to indexing_requests_pkey;
alter table public.indexing_requests
  rename constraint hackathon_requests_approved_hackathon_id_fkey
  to indexing_requests_hackathon_id_fkey;
alter table public.indexing_requests
  rename constraint hackathon_requests_approved_project_id_fkey
  to indexing_requests_project_id_fkey;
alter table public.indexing_requests
  rename constraint hackathon_requests_submitted_by_fkey
  to indexing_requests_submitted_by_fkey;
alter table public.indexing_requests
  rename constraint hackathon_requests_kind_check
  to indexing_requests_source_type_check;
alter table public.indexing_requests
  rename constraint hackathon_requests_normalized_url_check
  to indexing_requests_normalized_url_check;
alter index public.hackathon_requests_approved_hackathon_id_idx
  rename to indexing_requests_hackathon_id_idx;
alter index public.hackathon_requests_submitted_by_idx
  rename to indexing_requests_submitted_by_idx;
drop index public.hackathon_requests_pending_user_url_unique;

alter table public.indexing_requests
  drop constraint hackathon_requests_status_check,
  add column destination_path text,
  add column completed_at timestamp with time zone,
  add column progress_stage text,
  add column progress_completed integer not null default 0,
  add column progress_total integer,
  add constraint indexing_requests_destination_path_check
    check (destination_path is null or destination_path like '/hackathons/%'),
  add constraint indexing_requests_progress_nonnegative_check
    check (progress_completed >= 0 and (progress_total is null or progress_total >= 0)),
  add constraint indexing_requests_progress_bounds_check
    check (progress_total is null or progress_completed <= progress_total);

update public.indexing_requests
set status = case when status = 'approved' then 'ready' else status end;

alter table public.indexing_requests
  add constraint indexing_requests_status_check
    check (status in ('pending', 'queued', 'running', 'ready', 'rejected', 'failed'));

create index indexing_requests_submitted_by_created_at_idx
  on public.indexing_requests (submitted_by, created_at desc);
create index indexing_requests_source_status_idx
  on public.indexing_requests (source_type, status);
create index indexing_requests_normalized_url_idx
  on public.indexing_requests (normalized_url);

comment on table public.indexing_requests is
  'User-owned Devpost indexing requests. Hackathons await admin approval; projects queue immediately.';

-- Anonymous Supabase users also use the authenticated Postgres role. Only the
-- owning auth user can read a request; writes go through the validated server
-- boundary or a service-role worker.
drop policy if exists "Users can read their indexing requests"
  on public.indexing_requests;
drop policy if exists "Users can submit pending indexing requests"
  on public.indexing_requests;
revoke all on table public.indexing_requests from anon, authenticated;
grant select on table public.indexing_requests to authenticated;
grant all on table public.indexing_requests to service_role;
create policy "Users can read their indexing requests"
  on public.indexing_requests
  for select
  to authenticated
  using ((select auth.uid()) = submitted_by);

-- Postgres Changes applies the SELECT policy before delivering row updates.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'indexing_requests'
  ) then
    alter publication supabase_realtime add table public.indexing_requests;
  end if;
end
$$;

-- Fail fast if table grants drift while this migration evolves.
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

commit;
