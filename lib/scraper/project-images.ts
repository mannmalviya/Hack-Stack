import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { HACKATHON_COVERS_BUCKET } from "@/lib/supabase/hackathon-covers";
import { PROJECT_COVERS_BUCKET } from "@/lib/supabase/project-covers";

export const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 3;
const DEVPOST_IMAGE_HOSTS = new Set([
  "d112y698adiu2z.cloudfront.net",
  "d2dmyh35ffsxbl.cloudfront.net",
]);
const BUCKET_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

type DownloadedImage = {
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function assertAllowedImageUrl(url: URL) {
  if (
    url.protocol !== "https:"
    || url.port
    || url.username
    || url.password
    || !DEVPOST_IMAGE_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new Error(`Refusing unexpected Devpost image URL: ${url.toString()}`);
  }
}

function detectImageType(bytes: Uint8Array): Omit<DownloadedImage, "bytes"> | null {
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

async function readBoundedImage(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength && contentLength > MAX_COVER_IMAGE_BYTES) {
    throw new Error(`Cover image exceeded ${MAX_COVER_IMAGE_BYTES} bytes`);
  }
  if (!response.body) throw new Error("Cover image response did not include a body");

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_COVER_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error(`Cover image exceeded ${MAX_COVER_IMAGE_BYTES} bytes`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function downloadDevpostCover(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<DownloadedImage> {
  let url = new URL(input);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    assertAllowedImageUrl(url);
    const response = await fetcher(url, {
      headers: {
        accept: BUCKET_MIME_TYPES.join(","),
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
      throw new Error(`Devpost image returned HTTP ${response.status} for ${url}`);
    }

    const declaredType = (response.headers.get("content-type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!BUCKET_MIME_TYPES.includes(declaredType)) {
      throw new Error(`Expected a supported image from ${url}, received ${declaredType || "unknown content"}`);
    }

    const bytes = await readBoundedImage(response);
    const detected = detectImageType(bytes);
    if (!detected || detected.contentType !== declaredType) {
      throw new Error(`Cover image content did not match its declared type: ${declaredType}`);
    }
    return { bytes, ...detected };
  }

  throw new Error(`Too many redirects while fetching cover image ${input}`);
}

export const downloadProjectCover = downloadDevpostCover;

const readyBuckets = new Map<string, Promise<void>>();

async function ensureCoverBucket(bucket: string) {
  const ready = readyBuckets.get(bucket);
  if (ready) return ready;

  const configuring = (async () => {
    const storage = getSupabaseAdmin().storage;
    const { data: existing, error: getError } = await storage.getBucket(bucket);
    const status = getError && "status" in getError ? getError.status : null;
    const statusCode = getError && "statusCode" in getError ? getError.statusCode : null;
    const bucketMissing = status === 404
      || String(statusCode) === "404"
      || Boolean(getError && /not found/i.test(getError.message));

    if (getError && !bucketMissing) {
      throw new Error(`Could not inspect ${bucket} bucket: ${getError.message}`);
    }

    const options = {
      public: true,
      fileSizeLimit: MAX_COVER_IMAGE_BYTES,
      allowedMimeTypes: BUCKET_MIME_TYPES,
    };
    const result = existing
      ? await storage.updateBucket(bucket, options)
      : await storage.createBucket(bucket, options);
    if (result.error) {
      throw new Error(`Could not configure ${bucket} bucket: ${result.error.message}`);
    }
  })();
  readyBuckets.set(bucket, configuring);

  try {
    await configuring;
  } catch (error) {
    readyBuckets.delete(bucket);
    throw error;
  }
}

function safePathSegment(value: string) {
  const segment = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!segment) throw new Error("Cover image path contained an empty segment");
  return segment;
}

export async function storeProjectCover(input: {
  sourceUrl: string;
  hackathonSlug: string;
  projectSlug: string;
}, fetcher: typeof fetch = fetch) {
  await ensureCoverBucket(PROJECT_COVERS_BUCKET);
  const image = await downloadDevpostCover(input.sourceUrl, fetcher);

  const path = [
    safePathSegment(input.hackathonSlug),
    safePathSegment(input.projectSlug),
    `cover.${image.extension}`,
  ].join("/");
  const { error } = await getSupabaseAdmin().storage
    .from(PROJECT_COVERS_BUCKET)
    .upload(path, image.bytes, {
      cacheControl: "3600",
      contentType: image.contentType,
      upsert: true,
    });
  if (error) throw new Error(`Could not store project cover ${path}: ${error.message}`);

  return { path, fetchedAt: new Date().toISOString() };
}

export async function removeProjectCover(path: string | null) {
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage
    .from(PROJECT_COVERS_BUCKET)
    .remove([path]);
  if (error) throw new Error(`Could not remove project cover ${path}: ${error.message}`);
}

export async function storeHackathonCover(input: {
  sourceUrl: string;
  hackathonSlug: string;
}, fetcher: typeof fetch = fetch) {
  await ensureCoverBucket(HACKATHON_COVERS_BUCKET);
  const image = await downloadDevpostCover(input.sourceUrl, fetcher);
  const path = [
    safePathSegment(input.hackathonSlug),
    `cover.${image.extension}`,
  ].join("/");
  const { error } = await getSupabaseAdmin().storage
    .from(HACKATHON_COVERS_BUCKET)
    .upload(path, image.bytes, {
      cacheControl: "3600",
      contentType: image.contentType,
      upsert: true,
    });
  if (error) throw new Error(`Could not store hackathon cover ${path}: ${error.message}`);

  return { path, fetchedAt: new Date().toISOString() };
}
