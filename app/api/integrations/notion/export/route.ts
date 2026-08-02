import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { exportWeeklyDigestToNotion } from "@/lib/notion-connector";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer(); if (!viewer || viewer.mode === "demo") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const context = await loadWorkspaceContext(viewer); if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const weekKey = new Date().toISOString().slice(0, 10); const result = await exportWeeklyDigestToNotion(context.organizationId, `manual-${weekKey}-${crypto.randomUUID()}`);
  if (result.status === "not_configured") return NextResponse.json({ error: "Connect Notion and choose a shared parent page first." }, { status: 409 });
  return NextResponse.json({ data: result });
}
