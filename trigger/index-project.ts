import { task } from "@trigger.dev/sdk";

import { processProjectIndexingRequest } from "@/lib/indexing/process-project-request";
import { markIndexingRequestFailed } from "@/lib/indexing/request-progress";

type IndexProjectPayload = { requestId: string };

export const indexDevpostProject = task({
  id: "index-devpost-project",
  maxDuration: 3600,
  retry: { maxAttempts: 3 },
  // Fires only once every retry is exhausted, so an attempt that fails and is
  // then retried never surfaces as "failed" in the user's live request list.
  onFailure: async ({ payload }: { payload: IndexProjectPayload }) => {
    await markIndexingRequestFailed(payload.requestId);
  },
  run: async (payload: IndexProjectPayload) => {
    await processProjectIndexingRequest(payload.requestId);
    return { requestId: payload.requestId };
  },
});
