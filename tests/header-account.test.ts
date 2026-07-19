import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@supabase/supabase-js";

import { getHeaderAccount } from "../lib/auth/header-account.ts";

function user(overrides: Partial<User> = {}): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-07-18T00:00:00.000Z",
    id: "user-id",
    user_metadata: {},
    ...overrides,
  };
}

test("anonymous users do not produce a header account", () => {
  assert.equal(getHeaderAccount(user({ is_anonymous: true })), null);
});

test("a recent GitHub identity supplies its name and avatar", () => {
  const account = getHeaderAccount(
    user({
      email: "judge@example.com",
      identities: [
        {
          created_at: "2026-07-17T00:00:00.000Z",
          id: "google-id",
          identity_data: { full_name: "Google Judge" },
          identity_id: "google-id",
          last_sign_in_at: "2026-07-17T00:00:00.000Z",
          provider: "google",
          updated_at: "2026-07-17T00:00:00.000Z",
          user_id: "user-id",
        },
        {
          created_at: "2026-07-18T00:00:00.000Z",
          id: "github-id",
          identity_data: {
            avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
            user_name: "octojudge",
          },
          identity_id: "github-id",
          last_sign_in_at: "2026-07-18T00:00:00.000Z",
          provider: "github",
          updated_at: "2026-07-18T00:00:00.000Z",
          user_id: "user-id",
        },
      ],
    }),
  );

  assert.deepEqual(account, {
    avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
    displayName: "octojudge",
  });
});

test("a linked GitHub identity supplies its avatar independently of metadata order", () => {
  const account = getHeaderAccount(
    user({
      app_metadata: { provider: "google", providers: ["google", "github"] },
      identities: [
        {
          created_at: "2026-07-17T00:00:00.000Z",
          id: "github-id",
          identity_data: {
            avatar_url: "https://avatars.githubusercontent.com/u/456?v=4",
            user_name: "linked-octojudge",
          },
          identity_id: "github-id",
          last_sign_in_at: "2026-07-17T00:00:00.000Z",
          provider: "github",
          updated_at: "2026-07-17T00:00:00.000Z",
          user_id: "user-id",
        },
        {
          created_at: "2026-07-18T00:00:00.000Z",
          id: "google-id",
          identity_data: { full_name: "Ada Judge" },
          identity_id: "google-id",
          last_sign_in_at: "2026-07-18T00:00:00.000Z",
          provider: "google",
          updated_at: "2026-07-18T00:00:00.000Z",
          user_id: "user-id",
        },
      ],
      user_metadata: {
        avatar_url: "https://example.com/google-avatar.png",
      },
    }),
  );

  assert.deepEqual(account, {
    avatarUrl: "https://avatars.githubusercontent.com/u/456?v=4",
    displayName: "Ada Judge",
  });
});

test("a non-GitHub sign-in uses the default avatar", () => {
  const account = getHeaderAccount(
    user({
      identities: [
        {
          created_at: "2026-07-18T00:00:00.000Z",
          id: "google-id",
          identity_data: {
            avatar_url: "https://example.com/google-avatar.png",
            full_name: "Ada Judge",
          },
          identity_id: "google-id",
          last_sign_in_at: "2026-07-18T00:00:00.000Z",
          provider: "google",
          updated_at: "2026-07-18T00:00:00.000Z",
          user_id: "user-id",
        },
      ],
    }),
  );

  assert.deepEqual(account, {
    avatarUrl: null,
    displayName: "Ada Judge",
  });
});

test("the display name falls back to the email prefix", () => {
  assert.equal(
    getHeaderAccount(user({ email: "evidence-judge@example.com" }))
      ?.displayName,
    "evidence-judge",
  );
});

test("untrusted GitHub avatar hosts are rejected", () => {
  const account = getHeaderAccount(
    user({
      app_metadata: { provider: "github" },
      user_metadata: {
        avatar_url: "https://example.com/not-github.png",
        user_name: "octojudge",
      },
    }),
  );

  assert.equal(account?.avatarUrl, null);
});
