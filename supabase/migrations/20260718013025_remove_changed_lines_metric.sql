alter table private.hacker_team_metrics
  drop constraint hacker_team_metrics_nonnegative_check,
  drop constraint hacker_team_metrics_changed_lines_check,
  drop column changed_lines,
  add constraint hacker_team_metrics_nonnegative_check check (
    commit_count >= 0
    and additions >= 0
    and deletions >= 0
  );

alter table private.hacker_contributor_metrics
  drop constraint hacker_contributor_metrics_nonnegative_check,
  drop constraint hacker_contributor_metrics_changed_lines_check,
  drop column credited_changed_lines,
  add constraint hacker_contributor_metrics_nonnegative_check check (
    credited_commit_count >= 0
    and credited_additions >= 0
    and credited_deletions >= 0
  );

comment on table private.hacker_team_metrics is
  'Commit, addition, and deletion totals aggregated once per Devpost project and insight run.';

comment on table private.hacker_contributor_metrics is
  'Commit, addition, and deletion totals fully credited to GitHub-resolved contributors within a project and insight run.';
