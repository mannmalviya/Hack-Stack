import assert from "node:assert/strict";
import test from "node:test";

import {
  compareHackathonsByDate,
  getHackathonHost,
} from "../lib/hackathons/explorer";

test("groups dated hackathon editions by event brand", () => {
  assert.equal(getHackathonHost("TreeHacks 2026"), "TreeHacks");
  assert.equal(getHackathonHost("Cal Hacks 11.0"), "Cal Hacks");
  assert.equal(getHackathonHost("CruzHacks"), "CruzHacks");
});

test("orders hackathons by event date and keeps missing dates last", () => {
  const oldest = { startsAt: "2025-01-01T00:00:00Z", endsAt: null };
  const newest = { startsAt: "2026-01-01T00:00:00Z", endsAt: null };
  const undated = { startsAt: null, endsAt: null };

  assert.deepEqual(
    [oldest, undated, newest].sort((left, right) => compareHackathonsByDate(left, right, "newest")),
    [newest, oldest, undated],
  );
  assert.deepEqual(
    [newest, undated, oldest].sort((left, right) => compareHackathonsByDate(left, right, "oldest")),
    [oldest, newest, undated],
  );
});
