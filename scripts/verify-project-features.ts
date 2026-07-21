import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readdir } from "node:fs/promises";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

// `--limit N` / `--limit=N` bounds a batch for testing; absent means "all".
function parseLimit(argv: string[]): number | undefined {
  const flagIndex = argv.findIndex((arg) => arg === "--limit");
  const raw =
    flagIndex >= 0
      ? argv[flagIndex + 1]
      : argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--limit must be a positive integer");
  }
  return value;
}

// How many projects to verify at once. Each worker runs its own Claude agent in
// its own clone, so they never touch the same files; the shared cursor in the
// pool guarantees no two workers ever claim the same project.
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 8;

function parseConcurrency(argv: string[]): number {
  const flagIndex = argv.findIndex((arg) => arg === "--concurrency");
  const raw =
    flagIndex >= 0
      ? argv[flagIndex + 1]
      : argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1];
  if (raw === undefined) return DEFAULT_CONCURRENCY;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_CONCURRENCY) {
    throw new Error(`--concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`);
  }
  return value;
}

// Restrict the run to a single hackathon, identified by its Devpost slug (the
// same value used in project page URLs, e.g. "cal-hacks-11-0").
function parseHackathon(argv: string[]): string | undefined {
  const flagIndex = argv.findIndex((arg) => arg === "--hackathon");
  const raw =
    flagIndex >= 0
      ? argv[flagIndex + 1]
      : argv.find((arg) => arg.startsWith("--hackathon="))?.split("=")[1];
  const slug = raw?.trim();
  if (raw !== undefined && !slug) {
    throw new Error("--hackathon requires a Devpost slug");
  }
  return slug || undefined;
}

// Backstop: remove any clone directories a previous crash left behind.
async function sweepStrayClones() {
  const tmp = os.tmpdir();
  let entries: string[];
  try {
    entries = await readdir(tmp);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => name.startsWith("hackstack-verify-"))
      .map((name) =>
        rm(path.join(tmp, name), { recursive: true, force: true }).catch(
          () => {},
        ),
      ),
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseLimit(argv);
  const concurrency = parseConcurrency(argv);
  const hackathonSlug = parseHackathon(argv);
  requiredEnvironment("DATABASE_URL");
  const githubToken = process.env.GITHUB_TOKEN;

  const [
    { and, asc, eq, exists, inArray, notExists, sql },
    { db, databaseClient },
    {
      featureVerificationResults,
      featureVerificationRuns,
      hackathons,
      projectRepositories,
      projects,
      repositoryIngestionRuns,
    },
    { verifyProjectFeatures },
  ] = await Promise.all([
    import("drizzle-orm"),
    import("../db"),
    import("../db/schema"),
    import("../lib/verification/run-verification"),
  ]);

  // One connection dedicated to advisory locks. Postgres advisory locks are
  // held per-connection, so acquire and release must run on the SAME
  // connection; a pooled query would land on an arbitrary one.
  let lock: Awaited<ReturnType<typeof databaseClient.reserve>> | undefined;

  try {
    lock = await databaseClient.reserve();

    // Claim a project across every running invocation (server-global lock), so
    // two terminals never process the same repo. Auto-released if the process
    // dies, so a crash never permanently blocks a project.
    const tryAdvisoryLock = async (key: number): Promise<boolean> => {
      const rows = await lock!`select pg_try_advisory_lock(${key}) as locked`;
      return (rows[0] as { locked: boolean } | undefined)?.locked === true;
    };
    const releaseAdvisoryLock = async (key: number): Promise<void> => {
      await lock!`select pg_advisory_unlock(${key})`;
    };

    // Fail fast on a mistyped --hackathon slug rather than silently verifying
    // nothing.
    if (hackathonSlug) {
      const [hackathon] = await db
        .select({ id: hackathons.id })
        .from(hackathons)
        .where(eq(hackathons.devpostSlug, hackathonSlug))
        .limit(1);
      if (!hackathon) {
        throw new Error(
          `No hackathon found with Devpost slug "${hackathonSlug}"`,
        );
      }
      console.log(`Restricting to hackathon: ${hackathonSlug}`);
    }

    // Every project with an ingested repo and a repo URL that has not yet been
    // verified successfully. Re-runs retry failed/partial and skip succeeded.
    // When --hackathon is set, only that hackathon's projects are considered.
    const candidatesQuery = db
      .select({
        projectRepositoryId: projectRepositories.id,
        projectId: projectRepositories.projectId,
        sourceUrl: projectRepositories.sourceUrl,
      })
      .from(projectRepositories)
      .where(
        and(
          sql`nullif(btrim(${projectRepositories.sourceUrl}), '') is not null`,
          // Optional hackathon filter (undefined is ignored by drizzle's and()).
          hackathonSlug
            ? exists(
                db
                  .select({ one: sql`1` })
                  .from(projects)
                  .innerJoin(
                    hackathons,
                    eq(projects.hackathonId, hackathons.id),
                  )
                  .where(
                    and(
                      eq(projects.id, projectRepositories.projectId),
                      eq(hackathons.devpostSlug, hackathonSlug),
                    ),
                  ),
              )
            : undefined,
          exists(
            db
              .select({ one: sql`1` })
              .from(repositoryIngestionRuns)
              .where(
                and(
                  eq(
                    repositoryIngestionRuns.projectRepositoryId,
                    projectRepositories.id,
                  ),
                  inArray(repositoryIngestionRuns.status, [
                    "succeeded",
                    "partial",
                  ]),
                ),
              ),
          ),
          notExists(
            db
              .select({ one: sql`1` })
              .from(featureVerificationRuns)
              .where(
                and(
                  eq(
                    featureVerificationRuns.projectRepositoryId,
                    projectRepositories.id,
                  ),
                  eq(featureVerificationRuns.status, "succeeded"),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(projectRepositories.id));

    const candidates = limit
      ? await candidatesQuery.limit(limit)
      : await candidatesQuery;

    console.log(
      `Projects to verify: ${candidates.length} (concurrency ${concurrency})`,
    );

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    async function processCandidate(
      candidate: (typeof candidates)[number],
      index: number,
    ): Promise<void> {
      const key = candidate.projectRepositoryId;
      const label = `[${index + 1}/${candidates.length}] repo ${key}`;

      // Claim the project across every running invocation. If another run (in
      // any terminal) already holds it, skip rather than duplicate the work.
      if (!(await tryAdvisoryLock(key))) {
        skipped += 1;
        console.log(`${label}: skipped (claimed by another run)`);
        return;
      }

      try {
        // Re-check under the lock: another run may have finished this project
        // between building the candidate list and acquiring the lock.
        const [alreadyVerified] = await db
          .select({ id: featureVerificationRuns.id })
          .from(featureVerificationRuns)
          .where(
            and(
              eq(featureVerificationRuns.projectRepositoryId, key),
              eq(featureVerificationRuns.status, "succeeded"),
            ),
          )
          .limit(1);
        if (alreadyVerified) {
          skipped += 1;
          console.log(`${label}: skipped (already verified)`);
          return;
        }

        console.log(`${label}: ${candidate.sourceUrl}`);

        // Open a run row so an interrupted attempt is still recorded.
        const now = new Date().toISOString();
        const [run] = await db
          .insert(featureVerificationRuns)
          .values({
            projectRepositoryId: key,
            status: "running",
            startedAt: now,
          })
          .returning({ id: featureVerificationRuns.id });

        try {
          const result = await verifyProjectFeatures(
            candidate.projectId,
            candidate.sourceUrl,
            githubToken,
          );

          const completedAt = new Date().toISOString();
          await db.transaction(async (tx) => {
            await tx
              .update(featureVerificationRuns)
              .set({
                status: result.status,
                resolvedCommitSha: result.resolvedCommitSha,
                featureCount: result.features.length,
                completedAt,
                errorDetail: result.errorDetail,
                updatedAt: completedAt,
              })
              .where(eq(featureVerificationRuns.id, run.id));

            if (result.features.length > 0) {
              await tx.insert(featureVerificationResults).values(
                result.features.map((feature) => ({
                  runId: run.id,
                  featureName: feature.featureName,
                  featureClaim: feature.featureClaim,
                  claimSource: feature.claimSource,
                  verificationOutcome: feature.verificationOutcome,
                  evidence: feature.evidence,
                  confidence: feature.confidence,
                })),
              );
            }
          });

          if (result.status === "succeeded") {
            succeeded += 1;
            console.log(
              `${label}: succeeded (${result.features.length} features)`,
            );
          } else {
            failed += 1;
            console.log(`${label}: failed - ${result.errorDetail ?? "unknown"}`);
          }
        } catch (error) {
          // A DB write or unexpected throw: record the run as failed, continue.
          failed += 1;
          const completedAt = new Date().toISOString();
          await db
            .update(featureVerificationRuns)
            .set({
              status: "failed",
              completedAt,
              errorDetail: errorMessage(error),
              updatedAt: completedAt,
            })
            .where(eq(featureVerificationRuns.id, run.id))
            .catch(() => {});
          console.error(`${label}: error - ${errorMessage(error)}`);
        }
      } finally {
        await releaseAdvisoryLock(key);
      }
    }

    // Cursor-based worker pool: each worker claims the next unclaimed index and
    // advances the shared cursor, so no project is ever handled by two workers.
    // Mirrors the GitHub ingestion pool in lib/github/ingest.ts. The clone dirs
    // are already unique per project (mkdtemp), so parallel agents never collide.
    let nextIndex = 0;
    async function worker(): Promise<void> {
      while (nextIndex < candidates.length) {
        const index = nextIndex;
        nextIndex += 1;
        await processCandidate(candidates[index], index);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, candidates.length) }, () =>
        worker(),
      ),
    );

    console.log(
      `Done. Succeeded: ${succeeded}, failed: ${failed}, skipped: ${skipped}.`,
    );
  } finally {
    if (lock) await lock.release();
    await sweepStrayClones();
    await databaseClient.end();
  }
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
