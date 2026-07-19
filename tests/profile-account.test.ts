import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@supabase/supabase-js";

import { getProfileAccount } from "../lib/auth/profile-account.ts";

function user(overrides: Partial<User> = {}): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-02T03:04:05.000Z",
    id: "user-id",
    user_metadata: {},
    ...overrides,
  };
}

test("anonymous sessions cannot produce profile details", () => {
  assert.equal(getProfileAccount(user({ is_anonymous: true })), null);
});

test("profile details identify the earliest durable signup provider", () => {
  const account = getProfileAccount(
    user({
      email: "judge@example.com",
      identities: [
        {
          created_at: "2026-02-01T00:00:00.000Z",
          id: "github-id",
          identity_data: {
            avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
            user_name: "octojudge",
          },
          identity_id: "github-id",
          provider: "github",
          user_id: "user-id",
        },
        {
          created_at: "2026-01-02T03:04:05.000Z",
          id: "google-id",
          identity_data: { full_name: "Ada Judge" },
          identity_id: "google-id",
          provider: "google",
          user_id: "user-id",
        },
      ],
    }),
  );

  assert.deepEqual(account, {
    avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
    connectedProviders: ["google", "github"],
    createdAt: "2026-01-02T03:04:05.000Z",
    displayName: "Ada Judge",
    email: "judge@example.com",
    signupProvider: "google",
  });
});

test("provider metadata is used when identity details are unavailable", () => {
  const account = getProfileAccount(
    user({
      app_metadata: { provider: "github", providers: ["github"] },
      user_metadata: { user_name: "metadata-judge" },
    }),
  );

  assert.equal(account?.signupProvider, "github");
  assert.deepEqual(account?.connectedProviders, ["github"]);
});
