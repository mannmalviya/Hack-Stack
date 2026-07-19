import { redirect } from "next/navigation";

import { AccountAvatar } from "@/components/account-avatar";
import { DeleteAccount } from "@/components/profile/delete-account";
import {
  type AccountProvider,
  getProfileAccount,
  providerLabel,
} from "@/lib/auth/profile-account";
import { createClient } from "@/lib/supabase/server";

function ProviderMark({ provider }: { provider: AccountProvider }) {
  return provider === "github" ? (
    <svg
      aria-hidden="true"
      className="size-4 fill-current"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.25a9.75 9.75 0 0 0-3.08 19c.49.09.67-.21.67-.47v-1.7c-2.73.59-3.3-1.16-3.3-1.16-.44-1.13-1.09-1.43-1.09-1.43-.89-.61.07-.6.07-.6.98.07 1.5 1.01 1.5 1.01.88 1.49 2.29 1.06 2.85.81.09-.63.34-1.06.63-1.3-2.18-.25-4.48-1.09-4.48-4.87 0-1.08.39-1.96 1.01-2.65-.1-.25-.44-1.26.1-2.62 0 0 .82-.26 2.68 1.01a9.3 9.3 0 0 1 4.88 0c1.86-1.27 2.68-1.01 2.68-1.01.54 1.36.2 2.37.1 2.62.63.69 1.01 1.57 1.01 2.65 0 3.79-2.3 4.61-4.49 4.86.35.3.67.87.67 1.76v2.61c0 .26.18.57.68.47A9.75 9.75 0 0 0 12 2.25Z" />
    </svg>
  ) : (
    <span aria-hidden="true" className="font-semibold text-blue-600 dark:text-blue-400">
      G
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:items-center">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{value}</dd>
    </div>
  );
}

type ProfilePageProps = {
  searchParams: Promise<{ delete_error?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { delete_error: deleteError } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const account = getProfileAccount(data.user);

  if (!account) {
    redirect("/login?next=/profile");
  }

  const joinedAt = new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(account.createdAt));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
          Profile
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Review the identity and providers connected to your HackStack account.
        </p>
      </header>

      <section aria-labelledby="account-details-heading" className="py-10">
        {deleteError ? (
          <p
            role="alert"
            className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            We couldn&apos;t delete your account. Please try again.
          </p>
        ) : null}
        <div className="mb-6 flex items-center gap-4">
          <AccountAvatar
            avatarUrl={account.avatarUrl}
            displayName={account.displayName}
            size="lg"
          />
          <div className="min-w-0">
            <h2
              id="account-details-heading"
              className="truncate text-2xl font-semibold tracking-[-0.03em]"
            >
              {account.displayName}
            </h2>
            {account.email ? (
              <p className="mt-1 truncate text-sm text-muted">{account.email}</p>
            ) : null}
          </div>
        </div>

        <dl className="border border-border bg-surface">
          <DetailRow label="Name" value={account.displayName} />
          <DetailRow label="Email" value={account.email ?? "Not provided"} />
          <DetailRow
            label="Signed up with"
            value={
              account.signupProvider ? (
                <span className="inline-flex items-center gap-2">
                  <ProviderMark provider={account.signupProvider} />
                  {providerLabel(account.signupProvider)}
                </span>
              ) : (
                "Provider unavailable"
              )
            }
          />
          <DetailRow
            label="Connected providers"
            value={
              account.connectedProviders.length > 0 ? (
                <span className="flex flex-wrap gap-2">
                  {account.connectedProviders.map((provider) => (
                    <span
                      key={provider}
                      className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1.5 text-xs font-medium"
                    >
                      <ProviderMark provider={provider} />
                      {providerLabel(provider)}
                    </span>
                  ))}
                </span>
              ) : (
                "Provider unavailable"
              )
            }
          />
          <DetailRow label="Member since" value={joinedAt} />
        </dl>
      </section>

      <section
        aria-labelledby="danger-zone-heading"
        className="mt-6 border border-red-300 bg-red-50/60 p-6 dark:border-red-900 dark:bg-red-950/20"
      >
        <h2 id="danger-zone-heading" className="font-semibold text-red-700 dark:text-red-400">
          Danger zone
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-red-800/80 dark:text-red-300/80">
          Permanently delete your HackStack account, login identities, indexing
          requests, and private account data. This cannot be undone.
        </p>
        <div className="mt-5">
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
