import * as cheerio from "cheerio";

const DEVPOST_PROJECT_HOSTS = new Set(["devpost.com", "www.devpost.com"]);

export type HackathonSource = {
  devpostUrl: string;
  devpostSlug: string;
  galleryUrl: string;
};

export type ScrapedHackathon = {
  name: string;
  organizer: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  projectCount: number;
};

export type GalleryProject = {
  devpostUrl: string;
  devpostSlug: string;
  name: string;
  tagline: string | null;
  coverImageSourceUrl: string | null;
};

export type TeamMember = {
  name: string;
  devpostUrl: string | null;
  contribution: string | null;
};

export type ScrapedProject = GalleryProject & {
  description: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  githubUrl: string | null;
  isWinner: boolean;
  winningTrack: string | null;
  teamData: TeamMember[];
  builtWithData: string[];
};

type EventJsonLd = {
  name?: unknown;
  description?: unknown;
  organizer?: { name?: unknown };
  startDate?: unknown;
  endDate?: unknown;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function nullableText(value: string) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function htmlToText(value: string) {
  const decoded = cheerio.load(`<textarea>${value}</textarea>`)("textarea").text();
  const $ = cheerio.load(decoded);
  const blocks = $("h1, h2, h3, h4, h5, h6, p, li")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);
  return nullableText(blocks.length > 0 ? blocks.join(" ") : $.text());
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalDate(value: unknown) {
  const date = optionalString(value);
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return new Date(date).toISOString();
}

function normalizeHttpUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value, "https://devpost.com");
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeHackathonUrl(input: string): HackathonSource {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Hackathon URL must be a valid absolute URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !hostname.endsWith(".devpost.com")
  ) {
    throw new Error("Hackathon URL must use an HTTPS *.devpost.com host");
  }

  const slug = hostname.slice(0, -".devpost.com".length);
  if (!slug || slug.includes(".") || slug === "www") {
    throw new Error("URL must point to a Devpost hackathon subdomain");
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/" && path !== "/project-gallery") {
    throw new Error("Use the hackathon overview or project-gallery URL");
  }

  const devpostUrl = `https://${hostname}/`;
  return {
    devpostUrl,
    devpostSlug: slug,
    galleryUrl: `${devpostUrl}project-gallery`,
  };
}

export function normalizeProjectUrl(input: string) {
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const match = url.pathname.match(/^\/software\/([^/]+)\/?$/);
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      !DEVPOST_PROJECT_HOSTS.has(hostname) ||
      !match
    ) {
      return null;
    }
    return `https://devpost.com/software/${match[1]}`;
  } catch {
    return null;
  }
}

function parseEventJsonLd($: cheerio.CheerioAPI): EventJsonLd {
  const raw = $("#challenge-json-ld").text().trim();
  if (!raw) throw new Error("Devpost event metadata was not found");

  try {
    const parsed = JSON.parse(raw) as EventJsonLd;
    if (!parsed || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch {
    throw new Error("Devpost event metadata was malformed");
  }
}

export function parseHackathonPage(html: string): ScrapedHackathon {
  const $ = cheerio.load(html);
  const event = parseEventJsonLd($);
  const name = optionalString(event.name);
  if (!name) throw new Error("Devpost event name was not found");

  const countText = cleanText($(".pagination-info .items_info").text());
  const countMatch = countText.match(/\bof\s+([\d,]+)\b/i);
  const projectCount = countMatch
    ? Number.parseInt(countMatch[1].replaceAll(",", ""), 10)
    : $("a.link-to-software").length;

  return {
    name,
    organizer: optionalString(event.organizer?.name),
    description: optionalString(event.description)
      ? htmlToText(event.description as string)
      : null,
    startsAt: optionalDate(event.startDate),
    endsAt: optionalDate(event.endDate),
    projectCount,
  };
}

export function parseGalleryPage(html: string) {
  const $ = cheerio.load(html);
  const projects: GalleryProject[] = [];

  $("a.link-to-software").each((_, element) => {
    const anchor = $(element);
    const devpostUrl = normalizeProjectUrl(anchor.attr("href") ?? "");
    if (!devpostUrl) return;

    const name = cleanText(anchor.find(".software-entry-name h5").text());
    if (!name) return;

    projects.push({
      devpostUrl,
      devpostSlug: devpostUrl.split("/").at(-1)!,
      name,
      tagline: nullableText(anchor.find(".tagline").text()),
      coverImageSourceUrl: normalizeHttpUrl(
        anchor.find("img.software_thumbnail_image").first().attr("src"),
      ),
    });
  });

  const nextHref = $(".pagination a[rel='next'], .pagination-info a[rel='next']")
    .first()
    .attr("href");
  return { projects, nextHref: nextHref ?? null };
}

function parseStory($: cheerio.CheerioAPI, projectName: string) {
  const candidates = $("#app-details-left > div").toArray();
  const storyElement = candidates.find((element) =>
    cleanText($(element).children("h1").first().text()) === projectName,
  ) ?? candidates.find((element) => {
    const candidate = $(element);
    return !candidate.attr("id") && candidate.children("h1, h2, h3").length > 0;
  });
  if (!storyElement) return null;

  const copy = $(storyElement).clone();
  copy.children("h1").first().remove();
  const blocks = copy.find("h2, h3, h4, h5, h6, p, li")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);
  return nullableText(blocks.length > 0 ? blocks.join(" ") : copy.text());
}

function parseAwards($: cheerio.CheerioAPI, hackathonUrl: string) {
  const expectedHost = new URL(hackathonUrl).hostname;
  const tracks: string[] = [];

  $("#submissions > ul > li").each((_, element) => {
    const submission = $(element);
    const isMatchingHackathon = submission.find("a[href]").toArray().some((anchor) => {
      try {
        return new URL($(anchor).attr("href")!).hostname === expectedHost;
      } catch {
        return false;
      }
    });
    if (!isMatchingHackathon) return;

    submission.find("span.winner").each((__, winner) => {
      const award = $(winner).parent().clone();
      award.find("span.winner").remove();
      tracks.push(cleanText(award.text()) || "Winner");
    });
  });

  const uniqueTracks = [...new Set(tracks)];
  return {
    isWinner: uniqueTracks.length > 0,
    winningTrack: uniqueTracks.length > 0 ? uniqueTracks.join("; ") : null,
  };
}

export function parseProjectPage(
  html: string,
  card: GalleryProject,
  hackathonUrl: string,
): ScrapedProject {
  const $ = cheerio.load(html);
  const name = cleanText($("#app-title").text()) || card.name;
  const tagline = nullableText($("#software-header p.large").first().text()) ?? card.tagline;
  const links = $("nav.app-links a[href]")
    .toArray()
    .map((anchor) => normalizeHttpUrl($(anchor).attr("href")))
    .filter((url): url is string => Boolean(url));
  const githubUrl = links.find((link) => {
    const host = new URL(link).hostname.toLowerCase();
    return host === "github.com" || host === "www.github.com";
  }) ?? null;
  const demoUrl = links.find((link) => link !== githubUrl) ?? null;

  const teamData = $("#app-team .software-team-member")
    .toArray()
    .map((member): TeamMember | null => {
      const row = $(member);
      const profile = row.find("a.user-profile-link").filter((_, anchor) =>
        Boolean(cleanText($(anchor).text())),
      ).first();
      const memberName = cleanText(profile.text());
      if (!memberName) return null;
      return {
        name: memberName,
        devpostUrl: normalizeHttpUrl(profile.attr("href")),
        contribution: nullableText(row.find(".bubble").text()),
      };
    })
    .filter((member): member is TeamMember => Boolean(member));

  const builtWithData = [...new Set(
    $("#built-with .cp-tag")
      .toArray()
      .map((technology) => cleanText($(technology).text()))
      .filter(Boolean),
  )];
  const videoUrl = normalizeHttpUrl($("iframe.video-embed").first().attr("src"));
  const coverImageSourceUrl = normalizeHttpUrl(
    $("meta[property='og:image']").first().attr("content"),
  ) ?? card.coverImageSourceUrl;
  const awards = parseAwards($, hackathonUrl);

  return {
    ...card,
    name,
    tagline,
    coverImageSourceUrl,
    description: parseStory($, name),
    demoUrl,
    videoUrl,
    githubUrl,
    ...awards,
    teamData,
    builtWithData,
  };
}
