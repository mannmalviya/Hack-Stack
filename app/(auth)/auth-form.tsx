"use client";

import { useState } from "react";

import { HackStackLogo } from "@/components/hackstack-logo";
import { Reveal } from "@/components/motion/reveal";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

type AuthFormProps = {
  callbackError?: string;
  nextPath?: string;
};

const callbackErrorMessages: Record<string, string> = {
  account_delete_failed:
    "We couldn't delete your account. Sign in and try again.",
  configuration:
    "Authentication is not configured. Please contact the HackStack team.",
  oauth: "We couldn't complete your sign-in. Please try again.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.35 12.27c0-.75-.07-1.47-.2-2.16H12v4.09h5.23a4.47 4.47 0 0 1-1.94 2.93v2.65h3.41c2-1.84 3.15-4.56 3.15-7.51Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.75c2.62 0 4.82-.87 6.42-2.36l-3.41-2.65c-.94.63-2.15 1-3.01 1-2.32 0-4.29-1.57-4.99-3.68H3.49v2.73A9.7 9.7 0 0 0 12 21.75Z"
        fill="#34A853"
      />
      <path
        d="M7.01 14.06A5.8 5.8 0 0 1 6.73 12c0-.71.1-1.4.28-2.06V7.21H3.49A9.7 9.7 0 0 0 2.25 12c0 1.74.47 3.37 1.24 4.79l3.52-2.73Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.27c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3.35 14.62 2.25 12 2.25a9.7 9.7 0 0 0-8.51 4.96l3.52 2.73c.7-2.11 2.67-3.67 4.99-3.67Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 fill-current"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.25a9.75 9.75 0 0 0-3.08 19c.49.09.67-.21.67-.47v-1.7c-2.73.59-3.3-1.16-3.3-1.16-.44-1.13-1.09-1.43-1.09-1.43-.89-.61.07-.6.07-.6.98.07 1.5 1.01 1.5 1.01.88 1.49 2.29 1.06 2.85.81.09-.63.34-1.06.63-1.3-2.18-.25-4.48-1.09-4.48-4.87 0-1.08.39-1.96 1.01-2.65-.1-.25-.44-1.26.1-2.62 0 0 .82-.26 2.68 1.01a9.3 9.3 0 0 1 4.88 0c1.86-1.27 2.68-1.01 2.68-1.01.54 1.36.2 2.37.1 2.62.63.69 1.01 1.57 1.01 2.65 0 3.79-2.3 4.61-4.49 4.86.35.3.67.87.67 1.76v2.61c0 .26.18.57.68.47A9.75 9.75 0 0 0 12 2.25Z" />
    </svg>
  );
}

function safeNextPath(nextPath?: string) {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/hackathons";
}

export function AuthForm({ callbackError, nextPath }: AuthFormProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(
    callbackError ? callbackErrorMessages[callbackError] : null,
  );
  const destination = safeNextPath(nextPath);

  async function continueWith(provider: Provider) {
    setError(null);
    setLoadingProvider(provider);

    try {
      const callbackUrl = new URL("/callback", window.location.origin);
      callbackUrl.searchParams.set("next", destination);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const oauthOptions = {
        provider,
        options: { redirectTo: callbackUrl.toString() },
      } as const;
      // Guests carry submitted requests on their anonymous user, so link the
      // provider to it rather than starting a fresh session. This applies to
      // login as well as signup — a guest who reaches for "sign in" would
      // otherwise lose every request they submitted.
      let { data, error: signInError } = user?.is_anonymous
        ? await supabase.auth.linkIdentity(oauthOptions)
        : await supabase.auth.signInWithOAuth(oauthOptions);

      // The provider account may already belong to a real user, which cannot be
      // linked onto the guest. Fall back to a normal sign-in so returning users
      // are not locked out; their guest-session requests stay on the anonymous
      // user and are not carried over.
      if (signInError?.code === "identity_already_exists") {
        ({ data, error: signInError } = await supabase.auth.signInWithOAuth(oauthOptions));
      }

      if (signInError) {
        throw signInError;
      }

      if (!data.url) {
        throw new Error("Unable to start authentication. Please try again.");
      }

      window.location.assign(data.url);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to start authentication. Please try again.",
      );
      setLoadingProvider(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <Reveal className="w-full max-w-sm">
        <section aria-labelledby="auth-heading">
          <div className="mb-8 text-center">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
              <HackStackLogo className="size-4 shrink-0 text-foreground" />
              HackStack
            </p>
            <h1
              id="auth-heading"
              className="mt-4 text-3xl font-semibold tracking-[-0.03em]"
            >
              Continue to HackStack
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Sign in or create an account to review hackathon projects with
              clear evidence.
            </p>
          </div>

          <div className="border border-border bg-surface p-6">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => continueWith("google")}
                disabled={loadingProvider !== null}
                className="flex h-11 w-full items-center justify-center gap-3 border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleMark />
                {loadingProvider === "google"
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => continueWith("github")}
                disabled={loadingProvider !== null}
                className="flex h-11 w-full items-center justify-center gap-3 bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GitHubMark />
                {loadingProvider === "github"
                  ? "Connecting to GitHub..."
                  : "Continue with GitHub"}
              </button>
            </div>

            {error ? (
              <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
