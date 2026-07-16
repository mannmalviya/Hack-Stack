import { createBrowserClient } from "@supabase/ssr";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Authentication is not configured. Add the Supabase URL and publishable key.",
    );
  }

  return { publishableKey, url };
}

export function createClient() {
  const { publishableKey, url } = getSupabaseConfig();

  return createBrowserClient(url, publishableKey);
}
