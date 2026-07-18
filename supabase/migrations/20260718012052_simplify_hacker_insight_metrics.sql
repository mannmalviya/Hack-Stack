alter table private.hacker_team_metrics
  drop constraint hacker_team_metrics_nonnegative_check,
  drop constraint hacker_team_metrics_contributor_coverage_check,
  drop constraint hacker_team_metrics_coauthored_check,
  drop constraint hacker_team_metrics_commit_window_check,
  drop column repository_count,
  drop column file_changes,
  drop column active_days,
  drop column contributor_count,
  drop column linked_contributor_count,
  drop column unlinked_contributor_count,
  drop column coauthored_commit_count,
  drop column coauthored_commit_ratio,
  drop column first_commit_at,
  drop column last_commit_at,
  add constraint hacker_team_metrics_nonnegative_check check (
    commit_count >= 0
    and additions >= 0
    and deletions >= 0
    and changed_lines >= 0
  );

alter table private.hacker_contributor_metrics
  drop constraint hacker_contributor_metrics_nonnegative_check,
  drop constraint hacker_contributor_metrics_commit_credit_check,
  drop constraint hacker_contributor_metrics_commit_window_check,
  drop column primary_commit_count,
  drop column coauthored_commit_count,
  drop column credited_file_changes,
  drop column active_days,
  drop column first_commit_at,
  drop column last_commit_at,
  add constraint hacker_contributor_metrics_nonnegative_check check (
    credited_commit_count >= 0
    and credited_additions >= 0
    and credited_deletions >= 0
    and credited_changed_lines >= 0
  );

comment on table private.hacker_team_metrics is
  'Commits and changed-line totals aggregated once per Devpost project and insight run.';

comment on table private.hacker_contributor_metrics is
  'Commits and changed-line totals fully credited to GitHub-resolved contributors within a project and insight run.';
