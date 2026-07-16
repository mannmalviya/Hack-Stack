const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;

type UrlGuard = (url: URL) => boolean;

function assertAllowed(url: URL, guard: UrlGuard) {
  if (!guard(url)) throw new Error(`Refusing unexpected scrape URL: ${url.toString()}`);
}

async function readBoundedBody(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
  }
  if (!response.body) throw new Error("Response did not include a body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

export async function fetchHtml(input: string, guard: UrlGuard) {
  let url = new URL(input);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    assertAllowed(url, guard);
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "HackStack/0.1 (+manual Devpost importer)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect from ${url} had no location`);
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Devpost returned HTTP ${response.status} for ${url}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Expected HTML from ${url}, received ${contentType || "unknown content"}`);
    }
    return readBoundedBody(response);
  }

  throw new Error(`Too many redirects while fetching ${input}`);
}

export function hackathonUrlGuard(expectedHost: string): UrlGuard {
  return (url) =>
    url.protocol === "https:" &&
    !url.port &&
    !url.username &&
    !url.password &&
    url.hostname === expectedHost &&
    url.pathname === "/project-gallery";
}

export const projectUrlGuard: UrlGuard = (url) =>
  url.protocol === "https:" &&
  !url.port &&
  !url.username &&
  !url.password &&
  (url.hostname === "devpost.com" || url.hostname === "www.devpost.com") &&
  /^\/software\/[^/]+\/?$/.test(url.pathname);

