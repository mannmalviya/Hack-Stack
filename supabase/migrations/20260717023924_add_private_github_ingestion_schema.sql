create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.github_repositories (
  id bigint generated always as identity primary key,
  github_repository_id bigint not null,
  github_node_id text not null,
  owner_github_id bigint not null,
  owner_login text not null,
  owner_type text not null,
  name text not null,
  full_name text not null,
  html_url text not null,
  default_branch text not null,
  visibility text not null,
  is_fork boolean not null,
  parent_github_repository_id bigint,
  archived boolean not null,
  disabled boolean not null,
  github_created_at timestamp with time zone not null,
  github_updated_at timestamp with time zone not null,
  github_pushed_at timestamp with time zone,
  api_etag text,
  metadata_fetched_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  constraint github_repositories_github_repository_id_unique
    unique (github_repository_id),
  constraint github_repositories_github_node_id_unique
    unique (github_node_id),
  constraint github_repositories_github_repository_id_positive
    check (github_repository_id > 0),
  constraint github_repositories_owner_github_id_positive
    check (owner_github_id > 0),
  constraint github_repositories_visibility_check
    check (visibility in ('public', 'private', 'internal')),
  constraint github_repositories_owner_type_check
    check (owner_type in ('User', 'Organization'))
);

comment on table private.github_repositories is
  'Canonical metadata for GitHub repositories validated by HackStack. Repository identity is based on GitHub''s stable numeric and node identifiers rather than its mutable owner/name.';

comment on column private.github_repositories.api_etag is
  'Most recent GitHub repository API ETag, retained for conditional metadata refreshes.';

comment on column private.github_repositories.metadata_fetched_at is
  'Time when HackStack most recently fetched this repository metadata from GitHub.';

create index github_repositories_full_name_idx
  on private.github_repositories (lower(full_name));

alter table private.github_repositories enable row level security;

revoke all on table private.github_repositories from public, anon, authenticated;
revoke all on sequence private.github_repositories_id_seq from public, anon, authenticated;

create table private.project_repositories (
  id bigint generated always as identity primary key,
  project_id uuid not null,
  repository_id bigint not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_repositories_project_id_fkey
    foreign key (project_id)
    references public.projects (id)
    on delete cascade,
  constraint project_repositories_repository_id_fkey
    foreign key (repository_id)
    references private.github_repositories (id)
    on delete cascade,
  constraint project_repositories_project_repository_unique
    unique (project_id, repository_id)
);

create index project_repositories_repository_id_idx
  on private.project_repositories (repository_id);

alter table private.project_repositories enable row level security;

revoke all on table private.project_repositories
  from public, anon, authenticated;

revoke all on sequence private.project_repositories_id_seq
  from public, anon, authenticated;

comment on table private.project_repositories is
  'Links imported Devpost projects to their canonical GitHub repositories.';

create table private.repository_ingestion_runs (
  id bigint generated always as identity primary key,
  project_repository_id bigint not null,
  status text not null default 'queued',
  requested_ref text,
  resolved_commit_sha text,
  started_at timestamptz,
  completed_at timestamptz,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_ingestion_runs_project_repository_id_fkey
    foreign key (project_repository_id)
    references private.project_repositories (id)
    on delete cascade,
  constraint repository_ingestion_runs_status_check
    check (status in ('queued', 'running', 'succeeded', 'partial', 'failed'))
);

create index repository_ingestion_runs_project_repository_created_at_idx
  on private.repository_ingestion_runs (project_repository_id, created_at desc);

create index repository_ingestion_runs_status_created_at_idx
  on private.repository_ingestion_runs (status, created_at);

alter table private.repository_ingestion_runs enable row level security;

revoke all on table private.repository_ingestion_runs
  from public, anon, authenticated;

revoke all on sequence private.repository_ingestion_runs_id_seq
  from public, anon, authenticated;

comment on table private.repository_ingestion_runs is
  'Tracks each GitHub ingestion attempt for a project repository link.';

create table private.repository_commits (
  id bigint generated always as identity primary key,
  project_repository_id bigint not null,
  commit_sha text not null,
  author_name text not null,
  author_email text not null,
  author_github_user_id bigint,
  author_github_login text,
  authored_at timestamptz not null,
  committed_at timestamptz not null,
  message text not null,
  parent_shas text[] not null default '{}',
  additions integer,
  deletions integer,
  changed_files integer,
  created_at timestamptz not null default now(),
  constraint repository_commits_project_repository_id_fkey
    foreign key (project_repository_id)
    references private.project_repositories (id)
    on delete cascade,
  constraint repository_commits_project_repository_sha_unique
    unique (project_repository_id, commit_sha),
  constraint repository_commits_additions_nonnegative
    check (additions is null or additions >= 0),
  constraint repository_commits_deletions_nonnegative
    check (deletions is null or deletions >= 0),
  constraint repository_commits_changed_files_nonnegative
    check (changed_files is null or changed_files >= 0)
);

create index repository_commits_project_repository_authored_at_idx
  on private.repository_commits (project_repository_id, authored_at);

create index repository_commits_project_repository_author_email_idx
  on private.repository_commits (project_repository_id, author_email);

alter table private.repository_commits enable row level security;

revoke all on table private.repository_commits
  from public, anon, authenticated;

revoke all on sequence private.repository_commits_id_seq
  from public, anon, authenticated;

comment on table private.repository_commits is
  'Stores unique Git commits discovered for each project repository link.';

create table private.repository_files (
  id bigint generated always as identity primary key,
  project_repository_id bigint not null,
  path text not null,
  blob_sha text not null,
  indexed_commit_sha text not null,
  language text,
  size_bytes bigint not null,
  line_count integer,
  is_binary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_files_project_repository_id_fkey
    foreign key (project_repository_id)
    references private.project_repositories (id)
    on delete cascade,
  constraint repository_files_project_repository_path_unique
    unique (project_repository_id, path),
  constraint repository_files_size_bytes_nonnegative
    check (size_bytes >= 0),
  constraint repository_files_line_count_nonnegative
    check (line_count is null or line_count >= 0)
);

create index repository_files_project_repository_language_idx
  on private.repository_files (project_repository_id, language);

alter table private.repository_files enable row level security;

revoke all on table private.repository_files
  from public, anon, authenticated;

revoke all on sequence private.repository_files_id_seq
  from public, anon, authenticated;

comment on table private.repository_files is
  'Stores current file metadata for each indexed project repository without source contents.';

create table private.repository_dependencies (
  id bigint generated always as identity primary key,
  project_repository_id bigint not null,
  ecosystem text not null,
  package_name text not null,
  version_constraint text,
  dependency_kind text not null,
  manifest_path text not null,
  indexed_commit_sha text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_dependencies_project_repository_id_fkey
    foreign key (project_repository_id)
    references private.project_repositories (id)
    on delete cascade,
  constraint repository_dependencies_identity_unique
    unique (
      project_repository_id,
      ecosystem,
      manifest_path,
      package_name,
      dependency_kind
    )
);

create index repository_dependencies_project_package_idx
  on private.repository_dependencies (project_repository_id, package_name);

create index repository_dependencies_ecosystem_package_idx
  on private.repository_dependencies (ecosystem, package_name);

alter table private.repository_dependencies enable row level security;

revoke all on table private.repository_dependencies
  from public, anon, authenticated;

revoke all on sequence private.repository_dependencies_id_seq
  from public, anon, authenticated;

comment on table private.repository_dependencies is
  'Stores dependencies extracted from repository manifests for technology analysis.';
