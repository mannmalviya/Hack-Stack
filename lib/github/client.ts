import { Octokit } from "octokit";

export function createGithubClient() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to ingest GitHub repository data");
  }

  return new Octokit({
    auth: token,
    userAgent: "HackStack/0.1 GitHub ingestion",
  });
}

export type GithubClient = ReturnType<typeof createGithubClient>;
