import { NextResponse } from "next/server";

import { assembleProjectExport } from "@/lib/ai/project-export";

type RouteContext = {
  params: Promise<{ slug: string; project: string }>;
};

/**
 * Markdown context bundle for chatting with an external AI agent about a
 * project. `?download=1` serves it as an attachment; otherwise it renders
 * inline so the client can read it into the clipboard.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { slug, project } = await params;

  let markdown: string | null;
  try {
    markdown = await assembleProjectExport(slug, project);
  } catch (error) {
    console.error(`Project export failed for ${slug}/${project}:`, error);
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }

  if (markdown === null) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "content-type": "text/markdown; charset=utf-8",
  };
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers["content-disposition"] =
      `attachment; filename="${project}-agent-context.md"`;
  }

  return new Response(markdown, { headers });
}
