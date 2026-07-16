-- Record published award results without turning HackStack into a scoring tool.
alter table public.projects
  add column is_winner boolean default false not null,
  add column winning_track text;

-- Winners must name a nonblank track; non-winners must not carry award data.
alter table public.projects
  add constraint projects_winner_track_check
  check (
    (is_winner and nullif(btrim(winning_track), '') is not null)
    or
    (not is_winner and winning_track is null)
  );
