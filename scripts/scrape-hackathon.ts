import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function usage(): never {
  console.error("Usage: npm run scrape:hackathon -- <hackathon-url> [--limit 5|10|20]");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  if (!url) usage();

  let limit = 20;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--limit" || !args[index + 1]) usage();
    limit = Number.parseInt(args[index + 1], 10);
    index += 1;
  }
  if (![5, 10, 20].includes(limit)) usage();

  const { importHackathon } = await import("../lib/scraper/import-hackathon");
  const { databaseClient } = await import("../db");

  try {
    const result = await importHackathon(url, {
      limit: limit as 5 | 10 | 20,
      onProgress(progress) {
        if (progress.type === "gallery") {
          console.log(`Discovered ${progress.discovered}/${progress.total} projects`);
        } else if (progress.type === "project") {
          const issues = [
            progress.detailFailed ? "detail fetch failed" : null,
            progress.imageFailed ? "cover storage failed" : null,
          ].filter(Boolean);
          const suffix = issues.length > 0 ? ` (${issues.join("; ")})` : "";
          console.log(`[${progress.completed}/${progress.total}] ${progress.name}${suffix}`);
        } else {
          const repository = progress.repository ? ` (${progress.repository})` : "";
          const error = progress.error ? `: ${progress.error}` : "";
          console.log(
            `[GitHub ${progress.completed}/${progress.total}] ${progress.name}${repository} — ${progress.status}${error}`,
          );
        }
      },
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await databaseClient.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
