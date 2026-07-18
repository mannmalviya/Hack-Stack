# HackStack

## Manual Devpost import

Set `DATABASE_URL`, `SUPABASE_URL`, a server-only `SUPABASE_SECRET_KEY`, and a
server-only `GITHUB_TOKEN` in `.env.local`, then import an approved public
Devpost hackathon directly from the command line. The GitHub token needs read
access to repository metadata and contents. Local Supabase uses
`SUPABASE_SERVICE_ROLE_KEY` instead of a hosted secret key; `supabase status`
prints the local value.

```bash
npm run scrape:hackathon -- https://example-hackathon.devpost.com/
```

Use `--limit all` to follow Devpost gallery pagination until every public
project in the hackathon has been discovered:

```bash
npm run scrape:hackathon -- https://example-hackathon.devpost.com/ --limit all
```

The optional limit must be `5`, `10`, `20`, or `all` and defaults to `all`. The command is
incremental. On a rerun it walks the gallery to discover submissions, skips every
project whose Devpost and GitHub data were previously stored successfully, and
runs the complete pipeline only for new or previously failed projects. A project
is persisted only when its detail page, cover handling, and GitHub ingestion all
succeed. Failed or partial projects are removed instead of retaining incomplete
project, repository, dependency, commit, file, or cover records.
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
