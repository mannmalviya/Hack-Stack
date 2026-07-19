import assert from "node:assert/strict";
import test from "node:test";

import {
  approvePendingRequest,
  shouldProcessHackathonRequest,
  type ApprovalStatus,
} from "../lib/indexing/admin-approval";

test("approves only after the pending request is queued and dispatched", async () => {
  const calls: string[] = [];
  const result = await approvePendingRequest("request-1", "2026-07-19T12:00:00.000Z", {
    queue: async () => {
      calls.push("queue");
      return true;
    },
    dispatch: async () => {
      calls.push("dispatch");
      return { id: "run-1" };
    },
    rollback: async () => {
      calls.push("rollback");
      return true;
    },
    readStatus: async () => "queued",
  });

  assert.deepEqual(calls, ["queue", "dispatch"]);
  assert.deepEqual(result, { outcome: "approved", runId: "run-1" });
});

test("does not dispatch a request that is no longer pending", async () => {
  let dispatched = false;
  const result = await approvePendingRequest("request-1", "2026-07-19T12:00:00.000Z", {
    queue: async () => false,
    dispatch: async () => {
      dispatched = true;
      return { id: "run-1" };
    },
    rollback: async () => true,
    readStatus: async () => "running",
  });

  assert.equal(dispatched, false);
  assert.deepEqual(result, { outcome: "not_pending" });
});

test("returns a failed dispatch to pending", async () => {
  const dispatchError = new Error("offline");
  const result = await approvePendingRequest("request-1", "2026-07-19T12:00:00.000Z", {
    queue: async () => true,
    dispatch: async () => {
      throw dispatchError;
    },
    rollback: async () => true,
    readStatus: async () => "pending",
  });

  assert.deepEqual(result, { outcome: "dispatch_failed", error: dispatchError });
});

test("does not roll back a request after worker progress", async () => {
  const dispatchError = new Error("response lost");
  const result = await approvePendingRequest("request-1", "2026-07-19T12:00:00.000Z", {
    queue: async () => true,
    dispatch: async () => {
      throw dispatchError;
    },
    rollback: async () => false,
    readStatus: async () => "running",
  });

  assert.deepEqual(result, {
    outcome: "dispatch_uncertain",
    error: dispatchError,
    status: "running",
  });
});

test("workers process only approved or retried hackathon requests", () => {
  const expected: Record<ApprovalStatus, boolean> = {
    pending: false,
    queued: true,
    running: true,
    ready: false,
    rejected: false,
    failed: false,
  };

  for (const [status, shouldProcess] of Object.entries(expected)) {
    assert.equal(shouldProcessHackathonRequest(status as ApprovalStatus), shouldProcess);
  }
});
