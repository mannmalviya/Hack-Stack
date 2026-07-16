import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl ? new URL(supabaseUrl) : null;
const projectCoverPatterns = parsedSupabaseUrl
  ? [new URL("/storage/v1/object/public/project-covers/**", parsedSupabaseUrl)]
  : [];
const isLocalSupabase = parsedSupabaseUrl
  ? ["127.0.0.1", "localhost", "[::1]"].includes(parsedSupabaseUrl.hostname)
  : false;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: projectCoverPatterns,
    // Next's optimizer blocks private IPs by default. Local Supabase runs on
    // loopback, so permit it only for local development URLs.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
};

export default nextConfig;
