import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

// This client is only constructed inside server-side import jobs. Never expose
// its secret through a NEXT_PUBLIC_ environment variable or browser bundle.
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    throw new Error(
      "Supabase Storage requires SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  adminClient = createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return adminClient;
}
