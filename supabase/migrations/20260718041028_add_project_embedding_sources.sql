create table private.project_embedding_sources (
  project_id uuid primary key,
  inspiration text not null,
  what_it_does text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_embedding_sources_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete cascade,
  constraint project_embedding_sources_nonblank_check check (
    nullif(btrim(inspiration), '') is not null
    and nullif(btrim(what_it_does), '') is not null
  )
);

alter table private.project_embedding_sources enable row level security;

revoke all on table private.project_embedding_sources
  from public, anon, authenticated;

comment on table private.project_embedding_sources is
  'Devpost Inspiration and What it does sections eligible for project similarity indexing.';
