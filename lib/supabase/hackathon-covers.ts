export const HACKATHON_COVERS_BUCKET = "hackathon-covers";

export function getHackathonCoverPublicUrl(path: string | null) {
  if (!path) return null;
  // Prefer the browser-reachable URL; SUPABASE_URL may be an internal service
  // address in hosted workers.
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!baseUrl) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${HACKATHON_COVERS_BUCKET}/${encodedPath}`;
}
