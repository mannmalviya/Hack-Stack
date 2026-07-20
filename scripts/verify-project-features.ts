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
  const limit = parseLimit(process.argv.slice(2));
  requiredEnvironment("DATABASE_URL");
  const githubToken = process.env.GITHUB_TOKEN;

  const [
    { and, asc, eq, exists, inArray, notExists, sql },
    { db, databaseClient },
    {
      featureVerificationResults,
      featureVerificationRuns,
      projectRepositories,
      repositoryIngestionRuns,
    },
    { verifyProjectFeatures },
  ] = await Promise.all([
    import("drizzle-orm"),
    import("../db"),
    import("../db/schema"),
    import("../lib/verification/run-verification"),
  ]);

  try {
    // Every project with an ingested repo and a repo URL that has not yet been
    // verified successfully. Re-runs retry failed/partial and skip succeeded.
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

    console.log(`Projects to verify: ${candidates.length}`);

    let succeeded = 0;
    let failed = 0;

    for (const [index, candidate] of candidates.entries()) {
      const label = `[${index + 1}/${candidates.length}] repo ${candidate.projectRepositoryId}`;
      console.log(`${label}: ${candidate.sourceUrl}`);

      // Open a run row so an interrupted attempt is still recorded.
      const now = new Date().toISOString();
      const [run] = await db
        .insert(featureVerificationRuns)
        .values({
          projectRepositoryId: candidate.projectRepositoryId,
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
          console.log(`${label}: failed — ${result.errorDetail ?? "unknown"}`);
        }
      } catch (error) {
        // A DB write or unexpected throw: record the run as failed and continue.
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
        console.error(`${label}: error — ${errorMessage(error)}`);
      }
    }

    console.log(`Done. Succeeded: ${succeeded}, failed: ${failed}.`);
  } finally {
    await sweepStrayClones();
    await databaseClient.end();
  }
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
