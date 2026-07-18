import type { Metadata } from "next";

import { IndexingRequestsWorkspace } from "@/components/requests/indexing-requests-workspace";
import { getIndexingRequestPageData } from "@/lib/data/indexing-requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Index Hackathons/Projects | HackStack",
  description: "Submit a Devpost hackathon or project for evidence-grounded indexing.",
};

export default async function RequestsPage() {
  const data = await getIndexingRequestPageData();
  return (
    <IndexingRequestsWorkspace
      initialRequests={data.requests}
      initialUserId={data.userId}
      isAnonymous={data.isAnonymous}
    />
  );
}
