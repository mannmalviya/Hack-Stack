import type { User, UserIdentity } from "@supabase/supabase-js";

import { getHeaderAccount } from "./header-account";

export type AccountProvider = "github" | "google";

export type ProfileAccount = {
  avatarUrl: string | null;
  connectedProviders: AccountProvider[];
  createdAt: string;
  displayName: string;
  email: string | null;
  signupProvider: AccountProvider | null;
};

function accountProvider(value: unknown): AccountProvider | null {
  return value === "github" || value === "google" ? value : null;
}

function identityCreatedAt(identity: UserIdentity) {
  const createdAt = Date.parse(identity.created_at ?? "");

  return Number.isNaN(createdAt) ? Number.POSITIVE_INFINITY : createdAt;
}

export function getProfileAccount(user: User | null): ProfileAccount | null {
  const headerAccount = getHeaderAccount(user);

  if (!user || !headerAccount) {
    return null;
  }

  const providerIdentities = (user.identities ?? [])
    .map((identity) => ({
      identity,
      provider: accountProvider(identity.provider),
    }))
    .filter(
      (entry): entry is { identity: UserIdentity; provider: AccountProvider } =>
        entry.provider !== null,
    )
    .sort(
      (left, right) =>
        identityCreatedAt(left.identity) - identityCreatedAt(right.identity),
    );
  const metadataProvider = accountProvider(user.app_metadata.provider);
  const signupProvider = providerIdentities[0]?.provider ?? metadataProvider;
  const connectedProviders = Array.from(
    new Set([
      ...providerIdentities.map(({ provider }) => provider),
      ...(Array.isArray(user.app_metadata.providers)
        ? user.app_metadata.providers
            .map(accountProvider)
            .filter((provider): provider is AccountProvider => provider !== null)
        : []),
    ]),
  );

  return {
    ...headerAccount,
    connectedProviders:
      connectedProviders.length > 0
        ? connectedProviders
        : signupProvider
          ? [signupProvider]
          : [],
    createdAt: user.created_at,
    email: user.email ?? null,
    signupProvider,
  };
}

export function providerLabel(provider: AccountProvider) {
  return provider === "github" ? "GitHub" : "Google";
}
