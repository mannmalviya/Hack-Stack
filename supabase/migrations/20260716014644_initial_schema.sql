-- HackStack initial schema
--
-- This migration captures the three tables created in Supabase Studio:
--   1. hackathon_requests
--   2. hackathons
--   3. projects

-- -----------------------------------------------------------------------------
-- Hackathon requests
-- -----------------------------------------------------------------------------

create table public.hackathon_requests (
  id uuid default gen_random_uuid() not null,
  submitted_url text not null,
  status text default 'pending'::text not null,
  submitted_by uuid,
  created_at timestamp with time zone default now() not null,
  reviewed_at timestamp with time zone,
  approved_hackathon_id uuid,

  constraint hackathon_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

comment on table public.hackathon_requests is
  'Stores user-submitted Devpost hackathon requests awaiting admin review. Tracks the requested import limit, approval status, submitter, reviewer, review notes, timestamps, and the indexed hackathon created after approval.';

alter table public.hackathon_requests enable row level security;

alter table public.hackathon_requests
  add constraint hackathon_requests_pkey primary key (id);

grant maintain, references, trigger, truncate
  on public.hackathon_requests to anon;

grant maintain, references, trigger, truncate
  on public.hackathon_requests to authenticated;

grant maintain, references, trigger, truncate
  on public.hackathon_requests to service_role;

-- -----------------------------------------------------------------------------
-- Indexed hackathons
-- -----------------------------------------------------------------------------

create table public.hackathons (
  id uuid default gen_random_uuid() not null,
  devpost_url text not null,
  devpost_slug text not null,
  name text not null,
  organizer text,
  description text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  project_count integer,
  indexing_status text default 'queued'::text not null,
  last_indexed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint hackathons_devpost_slug_unique
    unique (devpost_slug),

  constraint hackathons_devpost_url_unique
    unique (devpost_url),

  constraint hackathons_indexing_status_check
    check (
      indexing_status in (
        'queued',
        'running',
        'succeeded',
        'partial',
        'failed'
      )
    )
);

comment on table public.hackathons is
  'Stores approved Devpost hackathons indexed by HackStack, including source details, event metadata, project count, current indexing status, and import timestamps.';

alter table public.hackathons enable row level security;

alter table public.hackathons
  add constraint hackathons_pkey primary key (id);

alter table public.hackathon_requests
  add constraint hackathon_requests_approved_hackathon_id_fkey
  foreign key (approved_hackathon_id)
  references public.hackathons (id)
  on delete set null;

grant maintain, references, trigger, truncate
  on public.hackathons to anon;

grant maintain, references, trigger, truncate
  on public.hackathons to authenticated;

grant maintain, references, trigger, truncate
  on public.hackathons to service_role;

-- -----------------------------------------------------------------------------
-- Imported projects
-- -----------------------------------------------------------------------------

create table public.projects (
  id uuid default gen_random_uuid() not null,
  hackathon_id uuid not null,
  devpost_url text not null,
  devpost_slug text not null,
  name text not null,
  tagline text,
  description text,
  demo_url text,
  video_url text,
  github_url text,
  team_data jsonb default '[]'::jsonb not null,
  built_with_data jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint projects_hackathon_id_fkey
    foreign key (hackathon_id)
    references public.hackathons (id)
    on delete cascade,

  constraint projects_hackathon_slug_unique
    unique (hackathon_id, devpost_slug)
);

comment on table public.projects is
  'Stores imported hackathon project submissions from Devpost, including their hackathon association, external identifiers, project details, demo/video/GitHub links, team members, technologies used, and raw source-capture metadata for traceability and verification.';

alter table public.projects enable row level security;

alter table public.projects
  add constraint projects_pkey primary key (id);

create index projects_hackathon_id_idx
  on public.projects (hackathon_id);

create index hackathons_indexing_status_idx
  on public.hackathons (indexing_status);

create index hackathon_requests_approved_hackathon_id_idx
  on public.hackathon_requests (approved_hackathon_id);

grant maintain, references, trigger, truncate
  on public.projects to anon;

grant maintain, references, trigger, truncate
  on public.projects to authenticated;

grant maintain, references, trigger, truncate
  on public.projects to service_role;
