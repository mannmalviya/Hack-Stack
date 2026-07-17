alter table public.projects
  add column ingestion_completed_at timestamp with time zone;

update public.projects project
set ingestion_completed_at = coalesce(
  (
    select max(run.completed_at)
    from private.project_repositories link
    join private.repository_ingestion_runs run
      on run.project_repository_id = link.id
    where link.project_id = project.id
      and run.status = 'succeeded'
  ),
  project.updated_at
)
where exists (
  select 1
  from private.project_repositories link
  join private.repository_ingestion_runs run
    on run.project_repository_id = link.id
  where link.project_id = project.id
    and run.status = 'succeeded'
)
or (
  project.github_url is null
  and (
    project.description is not null
    or project.demo_url is not null
    or project.video_url is not null
    or project.is_winner
    or jsonb_array_length(project.team_data) > 0
    or jsonb_array_length(project.built_with_data) > 0
  )
);

comment on column public.projects.ingestion_completed_at is
  'Set only after the complete Devpost, cover, and optional GitHub pipeline succeeds. Null rows are incomplete and must be processed from the beginning.';
