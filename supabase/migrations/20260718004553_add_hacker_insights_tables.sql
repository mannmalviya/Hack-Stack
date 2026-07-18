create table private.hacker_insight_runs (
  id bigint generated always as identity primary key,
  hackathon_id uuid not null,
  source_last_indexed_at timestamptz not null,
  window_starts_at timestamptz not null,
  window_ends_at timestamptz not null,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hacker_insight_runs_hackathon_id_fkey
    foreign key (hackathon_id) references public.hackathons (id) on delete cascade,
  constraint hacker_insight_runs_source_unique
    unique (hackathon_id, source_last_indexed_at),
  constraint hacker_insight_runs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  constraint hacker_insight_runs_window_check
    check (window_ends_at >= window_starts_at),
  constraint hacker_insight_runs_lifecycle_check check (
    (status = 'queued' and started_at is null and completed_at is null and error_detail is null)
    or (status = 'running' and started_at is not null and completed_at is null and error_detail is null)
    or (status = 'succeeded' and started_at is not null and completed_at is not null and error_detail is null)
    or (status = 'failed' and started_at is not null and completed_at is not null and nullif(btrim(error_detail), '') is not null)
  )
);

create index hacker_insight_runs_hackathon_status_completed_idx
  on private.hacker_insight_runs (hackathon_id, status, completed_at desc);

create table private.hacker_team_metrics (
  run_id bigint not null,
  project_id uuid not null,
  repository_count integer not null default 0,
  commit_count bigint not null default 0,
  additions bigint not null default 0,
  deletions bigint not null default 0,
  changed_lines bigint not null default 0,
  file_changes bigint not null default 0,
  active_days integer not null default 0,
  contributor_count integer not null default 0,
  linked_contributor_count integer not null default 0,
  unlinked_contributor_count integer not null default 0,
  coauthored_commit_count bigint not null default 0,
  coauthored_commit_ratio numeric(7, 6) not null default 0,
  first_commit_at timestamptz,
  last_commit_at timestamptz,
  constraint hacker_team_metrics_pkey primary key (run_id, project_id),
  constraint hacker_team_metrics_run_id_fkey
    foreign key (run_id) references private.hacker_insight_runs (id) on delete cascade,
  constraint hacker_team_metrics_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete cascade,
  constraint hacker_team_metrics_nonnegative_check check (
    repository_count >= 0
    and commit_count >= 0
    and additions >= 0
    and deletions >= 0
    and changed_lines >= 0
    and file_changes >= 0
    and active_days >= 0
    and contributor_count >= 0
    and linked_contributor_count >= 0
    and unlinked_contributor_count >= 0
    and coauthored_commit_count >= 0
  ),
  constraint hacker_team_metrics_changed_lines_check
    check (changed_lines = additions + deletions),
  constraint hacker_team_metrics_contributor_coverage_check
    check (contributor_count = linked_contributor_count + unlinked_contributor_count),
  constraint hacker_team_metrics_coauthored_check check (
    coauthored_commit_count <= commit_count
    and coauthored_commit_ratio >= 0
    and coauthored_commit_ratio <= 1
  ),
  constraint hacker_team_metrics_commit_window_check check (
    (commit_count = 0 and first_commit_at is null and last_commit_at is null)
    or (commit_count > 0 and first_commit_at is not null and last_commit_at is not null and first_commit_at <= last_commit_at)
  )
);

create table private.hacker_contributor_metrics (
  run_id bigint not null,
  project_id uuid not null,
  github_user_id bigint not null,
  github_login text not null,
  display_name text not null,
  credited_commit_count bigint not null default 0,
  primary_commit_count bigint not null default 0,
  coauthored_commit_count bigint not null default 0,
  credited_additions bigint not null default 0,
  credited_deletions bigint not null default 0,
  credited_changed_lines bigint not null default 0,
  credited_file_changes bigint not null default 0,
  active_days integer not null default 0,
  first_commit_at timestamptz,
  last_commit_at timestamptz,
  constraint hacker_contributor_metrics_pkey
    primary key (run_id, project_id, github_user_id),
  constraint hacker_contributor_metrics_team_fkey
    foreign key (run_id, project_id)
    references private.hacker_team_metrics (run_id, project_id)
    on delete cascade,
  constraint hacker_contributor_metrics_identity_check check (
    github_user_id > 0
    and nullif(btrim(github_login), '') is not null
    and nullif(btrim(display_name), '') is not null
  ),
  constraint hacker_contributor_metrics_nonnegative_check check (
    credited_commit_count >= 0
    and primary_commit_count >= 0
    and coauthored_commit_count >= 0
    and credited_additions >= 0
    and credited_deletions >= 0
    and credited_changed_lines >= 0
    and credited_file_changes >= 0
    and active_days >= 0
  ),
  constraint hacker_contributor_metrics_commit_credit_check
    check (credited_commit_count = primary_commit_count + coauthored_commit_count),
  constraint hacker_contributor_metrics_changed_lines_check
    check (credited_changed_lines = credited_additions + credited_deletions),
  constraint hacker_contributor_metrics_commit_window_check check (
    (credited_commit_count = 0 and first_commit_at is null and last_commit_at is null)
    or (credited_commit_count > 0 and first_commit_at is not null and last_commit_at is not null and first_commit_at <= last_commit_at)
  )
);

create index hacker_contributor_metrics_run_github_user_idx
  on private.hacker_contributor_metrics (run_id, github_user_id);

alter table private.hacker_insight_runs enable row level security;
alter table private.hacker_team_metrics enable row level security;
alter table private.hacker_contributor_metrics enable row level security;

revoke all on table private.hacker_insight_runs from anon, authenticated;
revoke all on table private.hacker_team_metrics from anon, authenticated;
revoke all on table private.hacker_contributor_metrics from anon, authenticated;
revoke all on sequence private.hacker_insight_runs_id_seq from anon, authenticated;

comment on table private.hacker_insight_runs is
  'Atomic calculation snapshots for hackathon-level Hacker Insights.';
comment on table private.hacker_team_metrics is
  'Unique repository activity aggregated once per Devpost project and insight run.';
comment on table private.hacker_contributor_metrics is
  'Full commit activity credited to GitHub-resolved contributors within a project and insight run.';
