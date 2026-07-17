alter table public.projects
  add column ingestion_status text not null default 'pending',
  add column ingestion_error text;

-- Any row that already completed has usable data; treat it as succeeded.
update public.projects
set ingestion_status = 'succeeded'
where ingestion_completed_at is not null;

-- Refine to partial where the latest ingestion run for the project reported warnings.
update public.projects project
set ingestion_status = 'partial'
where project.ingestion_completed_at is not null
  and exists (
    select 1
    from private.project_repositories link
    join private.repository_ingestion_runs run
      on run.project_repository_id = link.id
    where link.project_id = project.id
      and run.status = 'partial'
      and run.id = (
        select max(latest_run.id)
        from private.repository_ingestion_runs latest_run
        join private.project_repositories latest_link
          on latest_run.project_repository_id = latest_link.id
        where latest_link.project_id = project.id
      )
  );

alter table public.projects
  add constraint projects_ingestion_status_check
  check (ingestion_status in ('pending', 'succeeded', 'partial', 'failed'));

comment on column public.projects.ingestion_status is
  'Outcome of the most recent import attempt: pending, succeeded, partial, or failed. failed rows are kept for manual review and retried on the next import; succeeded/partial rows are complete.';
comment on column public.projects.ingestion_error is
  'Human-readable reason a project ingestion failed or was partial, surfaced in hackathon insights for manual review.';
