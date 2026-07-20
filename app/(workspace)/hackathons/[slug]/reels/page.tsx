import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { setProjectStar } from "@/app/(workspace)/hackathons/[slug]/[projects]/actions";
import { ProjectReels } from "@/components/projects/project-reels";
import { getSignedInUserId } from "@/lib/auth/current-user";
import { getHackathonBySlug } from "@/lib/data/hackathons";
import { getProjectReels } from "@/lib/data/project-reels";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon) return { title: "Reels | HackStack" };
  return { title: `${hackathon.name} Reels | HackStack` };
}

export default async function ProjectReelsPage({ params }: PageProps) {
  const { slug } = await params;
  const [hackathon, userId] = await Promise.all([
    getHackathonBySlug(slug),
    getSignedInUserId(),
  ]);
  if (!hackathon) notFound();

  const items = await getProjectReels(slug, userId);

  return (
    <ProjectReels
      title={hackathon.name}
      backHref={`/hackathons/${slug}?view=projects`}
      backLabel="All projects"
      signInNext={`/hackathons/${slug}/reels`}
      items={items}
      signedIn={Boolean(userId)}
      onSetStar={setProjectStar}
      emptyNote="None of this hackathon's indexed projects submitted a demo video."
    />
  );
}
