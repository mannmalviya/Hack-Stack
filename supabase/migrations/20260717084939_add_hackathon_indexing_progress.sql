alter table public.hackathons
  add column indexing_stage text,
  add column indexing_progress_completed integer not null default 0,
  add column indexing_progress_total integer;

alter table public.hackathons
  add constraint hackathons_indexing_stage_check
    check (
      indexing_stage is null
      or indexing_stage in (
        'discovering_projects',
        'scraping_projects',
        'ingesting_repositories'
      )
    ),
  add constraint hackathons_indexing_progress_completed_nonnegative
    check (indexing_progress_completed >= 0),
  add constraint hackathons_indexing_progress_total_nonnegative
    check (indexing_progress_total is null or indexing_progress_total >= 0),
  add constraint hackathons_indexing_progress_bounds
    check (
      indexing_progress_total is null
      or indexing_progress_completed <= indexing_progress_total
    );

comment on column public.hackathons.indexing_stage is
  'Current Devpost or GitHub phase while indexing_status is running.';

comment on column public.hackathons.indexing_progress_completed is
  'Number of items completed in the current indexing stage.';

comment on column public.hackathons.indexing_progress_total is
  'Expected number of items in the current indexing stage when known.';
