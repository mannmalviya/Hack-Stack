import assert from "node:assert/strict";
import test from "node:test";

import { shouldProcessProject } from "../lib/scraper/incremental-import";

test("processes only missing or incomplete projects", () => {
  assert.equal(shouldProcessProject(undefined), true);
  assert.equal(shouldProcessProject({ ingestionCompletedAt: null }), true);
  assert.equal(shouldProcessProject({
    ingestionCompletedAt: "2026-07-17T19:00:00.000Z",
  }), false);
});
