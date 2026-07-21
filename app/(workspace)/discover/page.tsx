import type { Metadata } from "next";

import {
  loadReelAnalysis,
  setProjectStar,
} from "@/app/(workspace)/hackathons/[slug]/[projects]/actions";
import { ProjectReels } from "@/components/projects/project-reels";
import { getSignedInUserId } from "@/lib/auth/current-user";
import { getDiscoverReels } from "@/lib/data/project-reels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover | HackStack",
};

export default async function DiscoverPage() {
  const userId = await getSignedInUserId();
  const items = await getDiscoverReels(userId);

  return (
    <ProjectReels
      title="Discover"
      backHref="/hackathons"
      backLabel="Hackathons"
      signInNext="/discover"
      items={items}
      signedIn={Boolean(userId)}
      onSetStar={setProjectStar}
      onLoadAnalysis={loadReelAnalysis}
      // The feed mixes events, so each card names where it came from.
      showHackathon
      showShuffle
      emptyNote="No indexed project has submitted a demo video yet."
    />
  );
}
