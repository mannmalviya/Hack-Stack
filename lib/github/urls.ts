const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const REPOSITORY_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export type GithubRepositoryCoordinates = {
  owner: string;
  repo: string;
  canonicalUrl: string;
};

export function parseGithubRepositoryUrl(input: string): GithubRepositoryCoordinates {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("GitHub repository URL must be an absolute URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol)
    || url.port
    || url.username
    || url.password
    || !GITHUB_HOSTS.has(hostname)
  ) {
    throw new Error("GitHub repository URL must use github.com");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new Error("GitHub URL must point to a repository root");
  }

  const owner = decodeURIComponent(segments[0]);
  const repo = decodeURIComponent(segments[1]).replace(/\.git$/i, "");
  if (!owner || !repo || !REPOSITORY_SEGMENT.test(owner) || !REPOSITORY_SEGMENT.test(repo)) {
    throw new Error("GitHub repository owner or name was invalid");
  }

  return {
    owner,
    repo,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}
