import { config } from "dotenv";
import { parseImportLimit, type ImportLimit } from "../lib/scraper/import-limits";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function usage(): never {
  console.error("Usage: npm run scrape:hackathon -- <hackathon-url> [--limit 5|10|20|all]");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  if (!url) usage();

  let limit: ImportLimit = 20;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--limit" || !args[index + 1]) usage();
    const parsedLimit = parseImportLimit(args[index + 1]);
    if (parsedLimit === null) usage();
    limit = parsedLimit;
    index += 1;
  }

  const { importHackathon } = await import("../lib/scraper/import-hackathon");
  const { databaseClient } = await import("../db");

  try {
    const result = await importHackathon(url, {
      limit,
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
        } else if (progress.type === "github") {
          const repository = progress.repository ? ` (${progress.repository})` : "";
          const error = progress.error ? `: ${progress.error}` : "";
          console.log(
            `[GitHub ${progress.completed}/${progress.total}] ${progress.name}${repository} — ${progress.status}${error}`,
          );
        } else {
          const error = progress.error ? `: ${progress.error}` : "";
          console.log(`[Hacker Insights] ${progress.status}${error}`);
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
