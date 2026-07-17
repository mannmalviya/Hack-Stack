import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

type Author = {
  name: string;
  profileUrl?: string;
};

type ProjectSections = {
  inspiration?: string;
  whatItDoes?: string;
  howWeBuiltIt?: string;
  challenges?: string;
  accomplishments?: string;
  lessonsLearned?: string;
  whatsNext?: string;
};

type DevpostProject = {
  sourceUrl: string;
  fetchedAt: string;
  title?: string;
  tagline?: string;
  description?: string;
  authors: Author[];
  sections: ProjectSections;
  technologies: string[];
  links: {
    repository?: string;
    demo?: string;
    video?: string;
  };
  media: {
    imageUrls: string[];
  };
};

const USER_AGENT =
  "HackStackDevpostScraper/0.1 (+https://github.com; public-project-import)";

function usage(): never {
  throw new Error(
    "Usage: npm run scrape:devpost -- <public-devpost-project-url> <output-file.json>",
  );
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map(normalizeText).filter((value): value is string => Boolean(value)))];
}

function absoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function getMeta($: CheerioAPI, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = $(
      `meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`,
    )
      .first()
      .attr("content");
    const text = normalizeText(value);
    if (text) return text;
  }
}

function parseJsonLd($: CheerioAPI): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  $("script[type='application/ld+json']").each((_, script) => {
    const source = $(script).contents().text();
    if (!source.trim()) return;

    try {
      const parsed: unknown = JSON.parse(source);
      const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          nodes.push(record);
          if (record["@graph"]) visit(record["@graph"]);
        }
      };
      visit(parsed);
    } catch {
      // Ignore malformed structured data and continue with DOM-based extraction.
    }
  });

  return nodes;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeText(value) : undefined;
}

function jsonLdAuthors(nodes: Record<string, unknown>[]): Author[] {
  const authors: Author[] = [];

  for (const node of nodes) {
    const candidates = node.author ?? node.creator;
    const values = Array.isArray(candidates) ? candidates : [candidates];

    for (const value of values) {
      if (typeof value === "string") {
        const name = normalizeText(value);
        if (name) authors.push({ name });
      } else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const name = asString(record.name);
        if (name) {
          authors.push({ name, profileUrl: asString(record.url) });
        }
      }
    }
  }

  return dedupeAuthors(authors);
}

function dedupeAuthors(authors: Author[]): Author[] {
  const seen = new Set<string>();
  return authors.filter((author) => {
    const key = `${author.name.toLowerCase()}|${author.profileUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSection($: CheerioAPI, labels: string[]): string | undefined {
  const lowerLabels = labels.map((label) => label.toLowerCase());
  const heading = $("h1, h2, h3, h4, h5, h6")
    .filter((_, element) => {
      const text = normalizeText($(element).text())?.toLowerCase();
      return text ? lowerLabels.includes(text) : false;
    })
    .first();

  if (!heading.length) return undefined;

  const content: string[] = [];
  heading.nextUntil("h1, h2, h3, h4, h5, h6").each((_, sibling) => {
    content.push($(sibling).text());
  });

  if (content.length) return normalizeText(content.join(" "));

  // Some Devpost templates nest heading/content in a wrapper.
  const parent = heading.parent();
  const following = parent.next();
  if (following.length && !following.is("h1, h2, h3, h4, h5, h6")) {
    return normalizeText(following.text());
  }
}

function extractTechnologies($: CheerioAPI): string[] {
  const heading = $("h1, h2, h3, h4, h5, h6")
    .filter((_, element) => /^(built with|made with|technologies)$/i.test(normalizeText($(element).text()) ?? ""))
    .first();

  if (!heading.length) return [];

  const container = heading.next();
  const values = container.find("a, li, span").map((_, element) => $(element).text()).get();
  return uniqueStrings(values.length ? values : [container.text()]);
}

function extractDomAuthors($: CheerioAPI, sourceUrl: string): Author[] {
  const selectors = [
    ".project-member a",
    ".project-member-name a",
    ".user-profile-link",
    "[data-testid='project-member'] a",
    ".members a[href*='/']",
  ];

  const authors = selectors.flatMap((selector) =>
    $(selector)
      .map((_, element) => {
        const name = normalizeText($(element).text());
        if (!name) return undefined;
        return { name, profileUrl: absoluteUrl($(element).attr("href"), sourceUrl) };
      })
      .get(),
  );

  return dedupeAuthors(authors);
}

function firstMatchingLink(
  $: CheerioAPI,
  sourceUrl: string,
  predicate: (url: URL, text: string) => boolean,
): string | undefined {
  for (const element of $("a[href]").toArray()) {
    const href = absoluteUrl($(element).attr("href"), sourceUrl);
    if (!href) continue;

    try {
      const url = new URL(href);
      if (predicate(url, normalizeText($(element).text()) ?? "")) return href;
    } catch {
      // Invalid links are ignored.
    }
  }
}

function canonicalProjectUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("The project URL must be a valid absolute URL.");
  }

  const isDevpost = url.hostname === "devpost.com" || url.hostname.endsWith(".devpost.com");
  if (!isDevpost || !url.pathname.startsWith("/software/")) {
    throw new Error("Expected a public Devpost project URL such as https://devpost.com/software/project-name.");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

function extractProject(html: string, sourceUrl: string): DevpostProject {
  const $ = cheerio.load(html);
  const jsonLd = parseJsonLd($);
  const primaryJsonLd = jsonLd.find((node) => {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((value) => typeof value === "string" && /softwareapplication|creativework/i.test(value));
  });

  const title =
    getMeta($, "og:title", "twitter:title") ??
    asString(primaryJsonLd?.name) ??
    normalizeText($("h1").first().text());
  const description =
    getMeta($, "og:description", "description", "twitter:description") ??
    asString(primaryJsonLd?.description);

  const authors = dedupeAuthors([...jsonLdAuthors(jsonLd), ...extractDomAuthors($, sourceUrl)]);
  const imageUrls = uniqueStrings(
    $("meta[property='og:image'], meta[name='twitter:image']")
      .map((_, element) => absoluteUrl($(element).attr("content"), sourceUrl))
      .get(),
  );

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    title,
    tagline: getMeta($, "og:description", "twitter:description"),
    description,
    authors,
    sections: {
      inspiration: extractSection($, ["Inspiration"]),
      whatItDoes: extractSection($, ["What it does"]),
      howWeBuiltIt: extractSection($, ["How we built it"]),
      challenges: extractSection($, ["Challenges we ran into"]),
      accomplishments: extractSection($, ["Accomplishments that we're proud of"]),
      lessonsLearned: extractSection($, ["What we learned"]),
      whatsNext: extractSection($, ["What's next for this project"]),
    },
    technologies: extractTechnologies($),
    links: {
      repository: firstMatchingLink($, sourceUrl, (url) => /(^|\.)github\.com$|(^|\.)gitlab\.com$|(^|\.)bitbucket\.org$/i.test(url.hostname)),
      demo: firstMatchingLink($, sourceUrl, (url, text) => /demo|live|website|try it/i.test(text) && !url.hostname.endsWith("devpost.com")),
      video: firstMatchingLink($, sourceUrl, (url) => /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/i.test(url.hostname)),
    },
    media: { imageUrls },
  };
}

async function main(): Promise<void> {
  const [inputUrl, outputPath, ...unexpected] = process.argv.slice(2);
  if (!inputUrl || !outputPath || unexpected.length) usage();

  const sourceUrl = canonicalProjectUrl(inputUrl);
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Devpost returned ${response.status} ${response.statusText} for ${sourceUrl}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Expected an HTML page but received ${contentType || "an unknown content type"}.`);
  }

  const project = extractProject(await response.text(), sourceUrl);
  const destination = resolve(outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(project, null, 2)}\n`, "utf8");
  console.log(`Wrote ${destination}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
