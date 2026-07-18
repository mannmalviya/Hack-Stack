-- Authenticated indexing requests: a hackathon always means its complete
-- public gallery, while a project always means one Devpost submission.
alter table public.hackathon_requests
  add column request_kind text,
  add column normalized_url text,
  add column updated_at timestamp with time zone default now() not null,
  add column approved_project_id uuid;
update public.hackathon_requests
set request_kind = 'hackathon',
    normalized_url = submitted_url
where request_kind is null;
alter table public.hackathon_requests
  alter column request_kind set not null,
  alter column normalized_url set not null,
  add constraint hackathon_requests_kind_check
    check (request_kind in ('hackathon', 'project')),
  add constraint hackathon_requests_submitted_by_fkey
    foreign key (submitted_by) references auth.users(id) on delete cascade,
  add constraint hackathon_requests_approved_project_id_fkey
    foreign key (approved_project_id) references public.projects(id) on delete set null;
-- Existing anonymous rows cannot satisfy authenticated ownership. Keep them
-- only if they predate this feature and assign no fake identity.
delete from public.hackathon_requests where submitted_by is null;
alter table public.hackathon_requests alter column submitted_by set not null;
-- Normalized URLs are the deduplication and lookup key, so their shape is
-- enforced in the database rather than trusted from the server boundary.
-- Added after the backfill above so pre-existing rows are already normalized.
alter table public.hackathon_requests
  add constraint hackathon_requests_normalized_url_check
    check (
      (request_kind = 'hackathon'
        and normalized_url ~ '^https://[a-z0-9-]+\.devpost\.com/$')
      or (request_kind = 'project'
        and normalized_url ~ '^https://devpost\.com/software/[^/?#]+$')
    );
create index hackathon_requests_submitted_by_idx
  on public.hackathon_requests (submitted_by);
create unique index hackathon_requests_pending_user_url_unique
  on public.hackathon_requests (submitted_by, request_kind, normalized_url)
  where status = 'pending';
revoke all on public.hackathon_requests from anon, authenticated;
grant select, insert on public.hackathon_requests to authenticated;
create policy "Users can read their indexing requests"
  on public.hackathon_requests for select to authenticated
  using (submitted_by = (select auth.uid()));
create policy "Users can submit pending indexing requests"
  on public.hackathon_requests for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and approved_hackathon_id is null
    and approved_project_id is null
  );
comment on table public.hackathon_requests is
  'Authenticated Devpost indexing requests. Hackathon requests cover every public gallery project; project requests cover one submitted project.';
-- Project chat tables are intentionally not created here. They will land with
-- the chat feature, alongside their Drizzle schema in db/schema.
