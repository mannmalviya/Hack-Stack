export const PROJECT_COVERS_BUCKET = "project-covers";

export function getProjectCoverPublicUrl(path: string | null) {
  if (!path) return null;
  // Prefer the browser-reachable URL; SUPABASE_URL may be an internal service
  // address in hosted workers.
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!baseUrl) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${PROJECT_COVERS_BUCKET}/${encodedPath}`;
}
