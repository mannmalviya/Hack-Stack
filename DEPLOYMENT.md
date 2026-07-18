# HackStack Deployment Runbook

Environment model:

| Git branch | Vercel env | Supabase project    | Trigger.dev env |
| ---------- | ---------- | ------------------- | --------------- |
| `main`     | Production | `hack-stack-prod`   | `prod`          |
| `develop`  | Preview    | `hack-stack-staging`| `staging`       |
| PR branches| Preview    | `hack-stack-staging`| `staging`       |

Run the steps in order. Steps 1–3 must finish before the first deploy, because
the build fails without `DATABASE_URL` (see Gotchas).

---

## 1. Create the two Supabase projects

```bash
supabase login
supabase projects create hack-stack-staging --org-id <ORG_ID> --region <REGION> --db-password '<STAGING_DB_PASSWORD>'
supabase projects create hack-stack-prod    --org-id <ORG_ID> --region <REGION> --db-password '<PROD_DB_PASSWORD>'
supabase projects list   # record both project refs
```

Store both DB passwords in your password manager now — Supabase will not show
them again.

## 2. Push migrations to each project

The 15 migrations in `supabase/migrations` have never been applied to a hosted
project, so this is a full replay. Do staging first and confirm it succeeds
before touching prod.

```bash
# staging
supabase link --project-ref <STAGING_REF>
supabase db push

# production
supabase link --project-ref <PROD_REF>
supabase db push

# Leave staging linked when you finish. Local development does not use the link
# at all (`supabase start` runs containers on 54321/54322 regardless) — this is
# purely defensive, so a stray remote command hits staging instead of prod.
supabase link --project-ref <STAGING_REF>
```

`link` only sets a local pointer in `supabase/.temp/project-ref`; it applies
nothing on its own. One project is linked at a time, and it persists across
sessions, so `db push`, `db pull`, and `db reset --linked` all silently target
whatever is currently linked. Confirm before any destructive command:

```bash
cat supabase/.temp/project-ref
```

Before opening the app publicly, verify RLS on every **exposed** table — meaning
tables reachable through the Data API, i.e. those in the schemas listed under
`[api] schemas` in `config.toml` (`public`, `graphql_public`). The 11 `private.*`
tables are not exposed. Run this in the SQL editor of each project:

```sql
select n.nspname as schema, c.relname as table,
       c.relrowsecurity as rls_enabled, count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r' and n.nspname in ('public', 'private')
group by 1, 2, 3
order by rls_enabled, 1, 2;
```

Expect `rls_enabled = true` on all 14 tables. Policy counts differ by table, and
the difference is intentional:

- **`public.indexing_requests` — 1 policy, load-bearing.** A SELECT policy for
  `authenticated` (`auth.uid() = submitted_by`). The requests workspace subscribes
  to Postgres Changes from the browser, and Realtime applies the SELECT policy
  before delivering rows. Drop this policy and the live progress UI silently stops
  updating — no error, just no events. The table is also in the `supabase_realtime`
  publication, added idempotently by the same migration.
- **`public.hackathons`, `public.projects` — 0 policies, correct.** Read only
  server-side through Drizzle as the `postgres` role, which bypasses RLS. Nothing
  reaches them via the Data API.
- **11 `private.*` tables — 0 policies, correct.** Outside the exposed schema list
  and with grants revoked from `anon`/`authenticated`.

Two things to keep in mind:

- The real security boundary is `DATABASE_URL`. It connects as `postgres` and
  bypasses RLS entirely, so it must stay server-only and must never be given a
  `NEXT_PUBLIC_` prefix.
- Any *new* browser-side supabase-js read needs its own policy first. Without one
  it returns an empty array rather than an error, which is easy to misdiagnose.

Also check **Advisors → Security** in the dashboard after the first push; it flags
exposed tables without RLS automatically.

## 3. Configure Supabase Auth per project

The OAuth variables in `.env.example` (`GOOGLE_CLIENT_ID`,
`SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`, etc.) only configure the **local** Auth
container. For hosted projects, set providers in the dashboard instead:

For each project, in **Authentication → Providers**, enable Google and GitHub and
set the callback to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Add
that URL to the corresponding Google Cloud and GitHub OAuth app.

In **Authentication → URL Configuration**, set:

- Site URL — prod: your production domain. Staging: the stable **branch alias**,
  `https://hack-stack-git-develop-<scope>.vercel.app`, which always points at the
  latest `develop` deployment. Do not use a per-deployment URL; those change on
  every push and sign-in will break.
- Redirect URLs — include `https://*-<your-vercel-scope>.vercel.app/**` so PR
  previews can complete sign-in

Note that "Preview" is a Vercel environment type, not a synonym for staging.
Vercel has three built-in environments — Development, Preview, Production — and
Preview holds a single shared set of environment variables. So `develop` and
every PR branch all point at `hack-stack-staging`. That is intended here, but it
means a PR can affect staging data for every other preview. If you later want
`develop` isolated from PR previews, Vercel's Custom Environments (Pro and above)
provide a genuinely separate named environment with its own variables.

Use **separate OAuth apps** for staging and prod so a staging misconfiguration
cannot affect production logins.

## 4. Link and configure Vercel

```bash
npm i -g vercel@latest   # your CLI is outdated (54.x → 56.x)
vercel login
vercel link              # creates .vercel/ (already gitignored)
```

In the Vercel dashboard, set **Production Branch** to `main`
(Settings → Git). `develop` and PR branches then land in the Preview
environment automatically.

### Environment variables

Set these for **Production** (pointing at `hack-stack-prod`) and again for
**Preview** (pointing at `hack-stack-staging`):

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler** URI (port `6543`) | Required at build time |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<REF>.supabase.co` | Required at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | Browser-safe |
| `SUPABASE_SECRET_KEY` | Secret key | Server-only, never `NEXT_PUBLIC_` |
| `GITHUB_TOKEN` | PAT with `public_repo` | Repo + commit metadata |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key for that env | Gates job dispatch |
| `TRIGGER_PROJECT_REF` | Trigger.dev project ref | |

Use the transaction pooler, not the direct connection — `db/index.ts` already
sets `prepare: false`, which is exactly what the pooler requires, and serverless
functions exhaust direct connections quickly.

Use the **same variable name** in both scopes with different values. Never suffix
names (`..._STAGING`, `..._PROD`) — the code reads one name and Vercel injects the
value matching the environment being built.

In the dashboard, add each variable twice and **uncheck the scopes you do not
want**; the form pre-selects all three, which is how production credentials end up
in Preview by accident.

To do it in bulk, put the two value sets in local files (`.env*` is already
gitignored) and push each to its scope:

```bash
# .env.staging and .env.production — KEY=value per line, no surrounding quotes
push_env () {
  while IFS='=' read -r key value; do
    case "$key" in ''|\#*) continue ;; esac
    value="${value# }"                      # tolerate "KEY= value" spacing
    case "$key" in
      NEXT_PUBLIC_*) sensitivity=--no-sensitive ;;
      *)             sensitivity=--sensitive ;;
    esac
    vercel env add "$key" "$2" --value "$value" "$sensitivity" --force -y
  done < "$1"
}

push_env .env.staging    preview
push_env .env.production production
```

Secrets are marked `--sensitive`, making them write-only — they cannot be read
back, only overwritten. The `NEXT_PUBLIC_*` pair stays readable, which is what you
want, since it ships to the browser regardless and you will want to verify it.

Confirm what landed where:

```bash
vercel env ls
```

**Scoping staging to `develop` only.** `vercel env add` takes an optional branch
argument, so Preview variables can be pinned to one branch:

```bash
vercel env add DATABASE_URL preview develop --value "postgresql://...staging..." --sensitive -y
```

This is how you keep PR previews off the staging database later, without needing
Custom Environments. Leave it branch-wide for now — all previews sharing staging
is fine pre-launch — but this is the lever when it stops being fine.

**Do not set the Development scope.** `vercel env pull` writes the Development
values into `.env.local`, which would overwrite your local Supabase configuration
pointing at `127.0.0.1`. If you want to inspect deployed values, pull to a
throwaway path instead:

```bash
vercel env pull .env.vercel-check --environment=preview
```

## 5. Create GitHub Environments and secrets

`.github/workflows/deploy.yml` reads secrets from environments named exactly
`staging` and `production` (Settings → Environments).

Per environment:

| Secret | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | From `supabase login` / dashboard access tokens |
| `SUPABASE_DB_PASSWORD` | That project's DB password from step 1 |
| `SUPABASE_PROJECT_REF` | That project's ref |
| `TRIGGER_ACCESS_TOKEN` | Trigger.dev personal access token |
| `TRIGGER_PROJECT_REF` | Trigger.dev project ref |

On the `production` environment, add yourself as a **required reviewer** so
production migrations pause for approval.

Also create the `develop` branch, since both workflows key off it:

```bash
git checkout -b develop && git push -u origin develop
```

Then set branch protection on `main` requiring the `verify` check to pass.

## 6. Configure Trigger.dev environments

The tasks in `trigger/` import `lib/indexing`, which reaches the database,
GitHub, and Supabase Storage. Trigger.dev workers do **not** inherit Vercel's
environment, so set these in the Trigger.dev dashboard for each environment
(staging and prod), pointing at the matching Supabase project:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GITHUB_TOKEN`

Missing these is the most likely cause of a job that queues fine but fails on
its first run.

## 7. Verify

```bash
git push origin develop        # CI runs, migrations apply to staging, tasks deploy
```

Then, against the staging URL: sign in with Google and GitHub, submit one
project indexing request, and confirm the Trigger.dev run reaches `succeeded`
and cover images render. Only then merge `develop` into `main`.

---

## Gotchas

**`ENOTFOUND db.<ref>.supabase.co` means the wrong connection string.** That
hostname is the *direct* connection, which is IPv6-only and does not resolve from
Vercel functions, so every query fails with a 500 while the build succeeds
normally. The transaction pooler string looks structurally different — the project
ref moves into the username and the host is regional:

```text
# direct (unreachable from Vercel)
postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
# transaction pooler (correct)
postgresql://postgres.<ref>:PASSWORD@aws-1-<region>.pooler.supabase.com:6543/postgres
```

Fix with `vercel env add DATABASE_URL <scope> --force`, then **redeploy** —
runtime environment changes do not apply to already-built deployments.

**The build requires `DATABASE_URL`.** `db/index.ts` throws at module
evaluation, and `/` collects page data during the build, so a missing or
malformed value fails the Vercel build rather than degrading at runtime. CI
supplies placeholders; Vercel needs real ones.

**`NEXT_PUBLIC_SUPABASE_URL` is baked in at build time.** `next.config.ts`
derives `images.remotePatterns` from it, so a wrong value at build produces
broken cover images that no runtime change fixes — you must redeploy.

**Migrations race the app deploy.** Vercel's Git integration starts building on
push, independently of `deploy.yml`, so the new app version can go live before
migrations finish. Keep migrations additive and backwards compatible with the
previous release. If you need strict ordering, disable Vercel's Git integration
and deploy via `vercel deploy --prebuilt` as a final job in `deploy.yml`.

**`GITHUB_TOKEN` is reserved in GitHub Actions.** You cannot create a repository
secret with that name. It is only needed by Vercel and Trigger.dev, so this is
fine today — but if a workflow ever needs it, name the secret something else
(e.g. `GH_API_TOKEN`) and map it to `env.GITHUB_TOKEN`.

**Guest limits are per-deployment, not per-environment.** The ten-import and
three-question guest limits in the product rules apply against whichever
Supabase project the deployment points at. Staging traffic will not consume
production quota, but shared preview URLs all write to staging.
