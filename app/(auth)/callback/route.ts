import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeRedirectPath(nextPath: string | null, origin: string) {
  if (!nextPath?.startsWith("/")) {
    return "/hackathons";
  }

  const redirectUrl = new URL(nextPath, origin);

  return redirectUrl.origin === origin
    ? `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
    : "/hackathons";
}

function redirectToLogin(request: NextRequest, error: "configuration" | "oauth") {
  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("error", error);

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("error")) {
    return redirectToLogin(request, "oauth");
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return redirectToLogin(request, "oauth");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLogin(request, "oauth");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Authentication is not configured")
    ) {
      return redirectToLogin(request, "configuration");
    }

    return redirectToLogin(request, "oauth");
  }

  const destination = safeRedirectPath(
    request.nextUrl.searchParams.get("next"),
    request.nextUrl.origin,
  );

  return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
}
