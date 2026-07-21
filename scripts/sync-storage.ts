// Copies every cover image from the local Supabase Storage buckets to a hosted
// project (staging or production). The database snapshot only moves rows; the
// files those rows point at live in local Docker storage and must be synced
// separately with this script.
//
// Usage:
//   node --env-file=.env.admin.staging --import tsx scripts/sync-storage.ts
//
// Required env (put them in .env.admin.staging / .env.admin.production):
//   DEST_SUPABASE_URL               e.g. https://abcd1234.supabase.co
//   DEST_SUPABASE_SERVICE_ROLE_KEY  service_role key of the destination project
//
// The local source is auto-detected from `supabase status`; override with
// SOURCE_SUPABASE_URL + SOURCE_SUPABASE_SERVICE_ROLE_KEY if needed.

import { execFileSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Mirror the bucket settings declared in supabase/config.toml so the script
// can recreate them on a freshly reset destination.
const BUCKETS = ["hackathon-covers", "project-covers"];
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: "5MiB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};
const UPLOAD_CONCURRENCY = 8;

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function localCredentials() {
  if (process.env.SOURCE_SUPABASE_URL && process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SOURCE_SUPABASE_URL,
      key: process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const entries = new Map<string, string>();
  for (const line of output.split("\n")) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    entries.set(line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, ""));
  }
  const url = entries.get("API_URL");
  const key = entries.get("SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Could not read local credentials from `supabase status` — is local Supabase running?");
  }
  return { url, key };
}

async function ensureBucket(destination: SupabaseClient, bucket: string) {
  const { data } = await destination.storage.getBucket(bucket);
  if (data) return;
  const { error } = await destination.storage.createBucket(bucket, BUCKET_OPTIONS);
  if (error) throw new Error(`create bucket ${bucket}: ${error.message}`);
  console.log(`Created bucket ${bucket} on destination`);
}

// Storage lists one folder level at a time, so walk folders recursively and
// page within each folder.
async function listAllFiles(client: SupabaseClient, bucket: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        files.push(path);
      } else {
        files.push(...(await listAllFiles(client, bucket, path)));
      }
    }
    if (!data || data.length < pageSize) return files;
  }
}

async function copyFile(
  source: SupabaseClient,
  destination: SupabaseClient,
  bucket: string,
  path: string,
) {
  const { data, error } = await source.storage.from(bucket).download(path);
  if (error) throw new Error(`download ${bucket}/${path}: ${error.message}`);
  const { error: uploadError } = await destination.storage
    .from(bucket)
    .upload(path, await data.arrayBuffer(), {
      contentType: data.type || undefined,
      upsert: true,
    });
  if (uploadError) throw new Error(`upload ${bucket}/${path}: ${uploadError.message}`);
}

async function main() {
  const destinationUrl = requiredEnvironment("DEST_SUPABASE_URL");
  const destinationKey = requiredEnvironment("DEST_SUPABASE_SERVICE_ROLE_KEY");
  const local = localCredentials();
  if (new URL(local.url).host === new URL(destinationUrl).host) {
    throw new Error("Source and destination are the same Supabase project");
  }

  const source = createClient(local.url, local.key);
  const destination = createClient(destinationUrl, destinationKey);
  console.log(`Syncing storage: ${local.url} -> ${destinationUrl}`);

  for (const bucket of BUCKETS) {
    await ensureBucket(destination, bucket);
    const files = await listAllFiles(source, bucket);
    console.log(`${bucket}: ${files.length} files to copy`);
    let copied = 0;
    for (let index = 0; index < files.length; index += UPLOAD_CONCURRENCY) {
      const batch = files.slice(index, index + UPLOAD_CONCURRENCY);
      await Promise.all(batch.map((path) => copyFile(source, destination, bucket, path)));
      copied += batch.length;
      if (copied % 80 === 0 || copied === files.length) {
        console.log(`${bucket}: ${copied}/${files.length}`);
      }
    }
  }
  console.log("Storage sync complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
