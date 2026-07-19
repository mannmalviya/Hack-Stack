import type { User, UserIdentity } from "@supabase/supabase-js";

export type HeaderAccount = {
  avatarUrl: string | null;
  displayName: string;
};

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function latestIdentity(identities: UserIdentity[]) {
  return identities.reduce<UserIdentity | null>((latest, identity) => {
    if (!latest) {
      return identity;
    }

    const latestTime = Date.parse(latest.last_sign_in_at ?? "");
    const identityTime = Date.parse(identity.last_sign_in_at ?? "");

    return (Number.isNaN(identityTime) ? 0 : identityTime) >=
      (Number.isNaN(latestTime) ? 0 : latestTime)
      ? identity
      : latest;
  }, null);
}

function githubAvatarUrl(value: unknown) {
  const avatarUrl = textValue(value);

  if (!avatarUrl) {
    return null;
  }

  try {
    const url = new URL(avatarUrl);

    return url.protocol === "https:" &&
      (url.hostname === "avatars.githubusercontent.com" ||
        url.hostname === "github.com")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function getHeaderAccount(user: User | null): HeaderAccount | null {
  if (!user || user.is_anonymous) {
    return null;
  }

  const identity = latestIdentity(user.identities ?? []);
  const githubIdentity = user.identities?.find(
    (candidate) => candidate.provider === "github",
  );
  const identityData = identity?.identity_data ?? {};
  const githubIdentityData = githubIdentity?.identity_data ?? {};
  const userMetadata = user.user_metadata ?? {};
  const displayName =
    textValue(identityData.full_name) ??
    textValue(identityData.name) ??
    textValue(identityData.user_name) ??
    textValue(identityData.preferred_username) ??
    textValue(userMetadata.full_name) ??
    textValue(userMetadata.name) ??
    textValue(userMetadata.user_name) ??
    textValue(userMetadata.preferred_username) ??
    textValue(user.email)?.split("@")[0] ??
    "HackStack user";

  return {
    avatarUrl: githubIdentity
      ? githubAvatarUrl(githubIdentityData.avatar_url)
      : user.app_metadata.provider === "github"
        ? githubAvatarUrl(userMetadata.avatar_url)
        : null,
    displayName,
  };
}
