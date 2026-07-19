import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user && !data.user.is_anonymous) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    // Sign-out remains an idempotent navigation when auth is unavailable.
  }

  revalidatePath("/", "layout");

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
