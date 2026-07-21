-- Custom SQL migration file, put your code below! --

-- Foreign key to Supabase's protected auth schema. Deliberately not declared in
-- db/schema/project-stars.ts (see the comment beside that table's policies) so
-- drizzle-kit never tries to manage the auth schema. Owned here instead.
alter table public.project_stars
  add constraint project_stars_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- The app writes through Drizzle's superuser connection, which bypasses RLS.
-- These grants exist for direct PostgREST access from the browser, where the
-- policies in db/schema/project-stars.ts scope every row to its owner.
grant select, insert, delete on public.project_stars to authenticated;
grant all on public.project_stars to service_role;

comment on table public.project_stars is
  'Projects a signed-in user saved for later. One row per (user, project).';
