import assert from "node:assert/strict";
import test from "node:test";

import {
  formatIndexedProjectCount,
  getIndexCoverage,
  getIsFullyIndexed,
} from "../lib/index-coverage";

test("derives coverage independently from the import job outcome", () => {
  assert.equal(getIndexCoverage(20, 400), "partial");
  assert.equal(getIndexCoverage(400, 400), "complete");
  assert.equal(getIndexCoverage(0, 400), "none");
  assert.equal(getIndexCoverage(20, null), "unknown");
});

test("only treats complete coverage after a successful import as fully indexed", () => {
  assert.equal(getIsFullyIndexed("succeeded", 400, 400), true);
  assert.equal(getIsFullyIndexed("succeeded", 20, 400), false);
  assert.equal(getIsFullyIndexed("partial", 400, 400), false);
  assert.equal(getIsFullyIndexed("running", 400, 400), false);
});

test("formats indexed and available project counts together", () => {
  assert.equal(formatIndexedProjectCount(20, 400), "20 of 400 projects indexed");
  assert.equal(formatIndexedProjectCount(1, null), "1 project indexed");
});
