# HackStack

## Manual Devpost import

Set `DATABASE_URL`, `SUPABASE_URL`, a server-only `SUPABASE_SECRET_KEY`, and a
server-only `GITHUB_TOKEN` in `.env.local`, then import an approved public
Devpost hackathon directly from the command line. The GitHub token needs read
access to repository metadata and contents. Local Supabase uses
`SUPABASE_SERVICE_ROLE_KEY` instead of a hosted secret key; `supabase status`
prints the local value.

```bash
npm run scrape:hackathon -- https://example-hackathon.devpost.com/ --limit 20
```

The limit must be `5`, `10`, or `20` and defaults to `20`. The command upserts
the hackathon and projects, so it is safe to rerun to refresh public metadata.
Project cover images are downloaded only from approved Devpost CDN hosts,
validated as JPEG, PNG, or WebP files up to 5 MiB, and uploaded to the public
`project-covers` Supabase Storage bucket. The database retains the original
Devpost URL for provenance and stores the owned object path separately.

After the Devpost projects are persisted, repository links are ingested with
Octokit. The importer upserts canonical repository metadata, commit history and
contribution counts, current file metadata, and dependencies parsed from npm,
Python, Cargo, and Go manifests. Repository source contents are not persisted.

The command reports `partial` when a project detail, cover-image, or GitHub
operation fails while retaining gallery-card data and any details, Storage
path, or repository data captured by an earlier successful run.

## Scrape one public Devpost project

This command fetches one public project page and writes the extracted project text,
authors, technologies, links, and image references to a JSON file. It does not save
anything to the application database.

```bash
npm run scrape:devpost -- https://devpost.com/software/project-name ./tmp/project.json
```

Only crawl public Devpost project pages and respect Devpost's applicable terms and
rate limits.
