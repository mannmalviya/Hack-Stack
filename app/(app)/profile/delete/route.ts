import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse("Invalid request origin", { status: 403 });
  }

  const formData = await request.formData();

  if (formData.get("confirmation") !== "DELETE") {
    return redirect(request, "/profile?delete_error=confirmation");
  }

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user || data.user.is_anonymous) {
    return redirect(request, "/login?next=/profile");
  }

  const userId = data.user.id;
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });

  if (signOutError) {
    return redirect(request, "/profile?delete_error=session");
  }

  try {
    const { error: deleteError } = await getSupabaseAdmin().auth.admin.deleteUser(
      userId,
      false,
    );

    if (deleteError) {
      return redirect(
        request,
        "/login?error=account_delete_failed&next=/profile",
      );
    }
  } catch {
    return redirect(
      request,
      "/login?error=account_delete_failed&next=/profile",
    );
  }

  revalidatePath("/", "layout");

  return redirect(request, "/?account=deleted");
}
