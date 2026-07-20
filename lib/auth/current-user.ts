import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's id, or null.
 *
 * Guests get anonymous Supabase sessions, so a user object alone does not mean
 * signed in — anonymous sessions are treated as signed out here, matching
 * getHeaderAccount and getProfileAccount. Auth failures resolve to null rather
 * than throwing so a misconfigured environment degrades to the guest view
 * instead of breaking the page.
 */
export async function getSignedInUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
