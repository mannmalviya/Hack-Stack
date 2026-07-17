# HackStack

## Manual Devpost import

Set `DATABASE_URL`, `SUPABASE_URL`, and a server-only `SUPABASE_SECRET_KEY` in
`.env.local`, then import an approved public Devpost hackathon directly from
the command line. Local Supabase uses `SUPABASE_SERVICE_ROLE_KEY` instead of a
hosted secret key; `supabase status` prints the local value.

```bash
npm run scrape:hackathon -- https://example-hackathon.devpost.com/ --limit 20
```

The limit must be `5`, `10`, or `20` and defaults to `20`. The command upserts
the hackathon and projects, so it is safe to rerun to refresh public metadata.
Project cover images are downloaded only from approved Devpost CDN hosts,
validated as JPEG, PNG, or WebP files up to 5 MiB, and uploaded to the public
`project-covers` Supabase Storage bucket. The database retains the original
Devpost URL for provenance and stores the owned object path separately.

The command reports `partial` when a project detail or cover-image operation
fails while retaining gallery-card data and any details or Storage path
captured by an earlier successful run.

## Scrape one public Devpost project

This command fetches one public project page and writes the extracted project text,
authors, technologies, links, and image references to a JSON file. It does not save
anything to the application database.

```bash
npm run scrape:devpost -- https://devpost.com/software/project-name ./tmp/project.json
```

Only crawl public Devpost project pages and respect Devpost's applicable terms and
rate limits.
