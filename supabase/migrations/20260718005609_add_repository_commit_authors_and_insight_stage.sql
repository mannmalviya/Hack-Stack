create table private.repository_commit_authors (
  repository_commit_id bigint not null,
  author_position smallint not null,
  is_primary boolean not null,
  author_name text not null,
  author_email text,
  author_github_user_id bigint,
  author_github_login text,
  constraint repository_commit_authors_pkey
    primary key (repository_commit_id, author_position),
  constraint repository_commit_authors_repository_commit_id_fkey
    foreign key (repository_commit_id)
    references private.repository_commits (id)
    on delete cascade,
  constraint repository_commit_authors_position_check check (
    author_position >= 0 and is_primary = (author_position = 0)
  ),
  constraint repository_commit_authors_github_identity_check check (
    (author_github_user_id is null and author_github_login is null)
    or (
      author_github_user_id > 0
      and nullif(btrim(author_github_login), '') is not null
    )
  )
);

create index repository_commit_authors_github_user_id_idx
  on private.repository_commit_authors (author_github_user_id);

alter table private.repository_commit_authors enable row level security;
revoke all on table private.repository_commit_authors from anon, authenticated;

comment on table private.repository_commit_authors is
  'Ordered primary and co-author identities returned by GitHub for each stored commit.';

-- Existing commit rows predate multi-author ingestion. Seed their primary author
-- so current repositories remain calculable until they are ingested again.
insert into private.repository_commit_authors (
  repository_commit_id,
  author_position,
  is_primary,
  author_name,
  author_email,
  author_github_user_id,
  author_github_login
)
select
  id,
  0,
  true,
  author_name,
  nullif(btrim(author_email), ''),
  case
    when author_github_user_id is not null
      and nullif(btrim(author_github_login), '') is not null
      then author_github_user_id
    else null
  end,
  case
    when author_github_user_id is not null
      and nullif(btrim(author_github_login), '') is not null
      then author_github_login
    else null
  end
from private.repository_commits;

alter table public.hackathons
  drop constraint hackathons_indexing_stage_check;

alter table public.hackathons
  add constraint hackathons_indexing_stage_check
  check (
    indexing_stage is null
    or indexing_stage in (
      'discovering_projects',
      'scraping_projects',
      'ingesting_repositories',
      'calculating_hacker_insights'
    )
  );
