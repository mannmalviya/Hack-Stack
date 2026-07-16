alter table public.projects
  add column cover_image_source_url text,
  add column cover_image_path text,
  add column cover_image_fetched_at timestamp with time zone,
  add constraint projects_cover_image_storage_check check (
    (cover_image_path is null and cover_image_fetched_at is null)
    or (
      nullif(btrim(cover_image_path), '') is not null
      and cover_image_fetched_at is not null
    )
  );

comment on column public.projects.cover_image_source_url is
  'Original Devpost CDN URL retained as source provenance for the project cover.';

comment on column public.projects.cover_image_path is
  'Object path for HackStack''s copy in the public project-covers Storage bucket.';

comment on column public.projects.cover_image_fetched_at is
  'Time when the current Storage copy of the project cover was downloaded.';
