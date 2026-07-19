import { queue, task } from "@trigger.dev/sdk";

import { processHackathonIndexingRequest } from "@/lib/indexing/process-hackathon-request";
import { markIndexingRequestFailed } from "@/lib/indexing/request-progress";

type IndexHackathonPayload = { requestId: string };

const hackathonIndexingQueue = queue({
  name: "hackathon-indexing-request",
  concurrencyLimit: 1,
});

export const indexDevpostHackathon = task({
  id: "index-devpost-hackathon",
  queue: hackathonIndexingQueue,
  maxDuration: 3600,
  retry: { maxAttempts: 3 },
  // Fires only once every retry is exhausted, so an attempt that fails and is
  // then retried never surfaces as "failed" in the user's live request list.
  onFailure: async ({ payload }: { payload: IndexHackathonPayload }) => {
    await markIndexingRequestFailed(payload.requestId);
  },
  run: async (payload: IndexHackathonPayload) => {
    await processHackathonIndexingRequest(payload.requestId);
    return { requestId: payload.requestId };
  },
});
