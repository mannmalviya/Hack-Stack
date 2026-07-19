export type ApprovalStatus =
  | "pending"
  | "queued"
  | "running"
  | "ready"
  | "rejected"
  | "failed";

type QueueApproval = (requestId: string, reviewedAt: string) => Promise<boolean>;
type DispatchApproval = (requestId: string) => Promise<{ id: string }>;
type RollbackApproval = (requestId: string, reviewedAt: string) => Promise<boolean>;
type ReadStatus = (requestId: string) => Promise<ApprovalStatus | null>;

type ApprovalDependencies = {
  queue: QueueApproval;
  dispatch: DispatchApproval;
  rollback: RollbackApproval;
  readStatus: ReadStatus;
};

export type ApprovalResult =
  | { outcome: "approved"; runId: string }
  | { outcome: "not_pending" }
  | { outcome: "dispatch_failed"; error: unknown }
  | { outcome: "dispatch_uncertain"; error: unknown; status: ApprovalStatus | null };

/**
 * Coordinates the database transition with external task dispatch. Rollback is
 * conditional on this exact review attempt, so it cannot undo worker progress
 * or a later approval.
 */
export async function approvePendingRequest(
  requestId: string,
  reviewedAt: string,
  dependencies: ApprovalDependencies,
): Promise<ApprovalResult> {
  const queued = await dependencies.queue(requestId, reviewedAt);
  if (!queued) return { outcome: "not_pending" };

  try {
    const run = await dependencies.dispatch(requestId);
    return { outcome: "approved", runId: run.id };
  } catch (error) {
    const rolledBack = await dependencies.rollback(requestId, reviewedAt);
    if (rolledBack) return { outcome: "dispatch_failed", error };

    return {
      outcome: "dispatch_uncertain",
      error,
      status: await dependencies.readStatus(requestId),
    };
  }
}

export function shouldProcessHackathonRequest(status: ApprovalStatus) {
  return status === "queued" || status === "running";
}
