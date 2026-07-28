import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadEvidence, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadEvidence(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { title?: string; type?: string; sourceUrl?: string; rights?: string };
  const title = clean(body.title, 200);
  const type = clean(body.type, 80) || "company fact";
  const sourceUrl = clean(body.sourceUrl, 1000);
  const rights = clean(body.rights, 500);
  if (title.length < 3) return NextResponse.json({ error: "Evidence needs a clear title." }, { status: 400 });
  if (sourceUrl) {
    try { new URL(sourceUrl); } catch { return NextResponse.json({ error: "Use a complete evidence URL beginning with https://." }, { status: 400 }); }
  }
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), title, type, sourceUrl: sourceUrl || null, status: "unverified" }, mode: "demo" }, { status: 201 });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Complete onboarding before adding evidence." }, { status: 409 });
  const rows = await supabaseRest<Array<Record<string, unknown>>>("evidence_items", {
    method: "POST", token: viewer.accessToken, prefer: "return=representation",
    body: { organization_id: context.organizationId, project_id: context.projectId, evidence_type: type, title, source_url: sourceUrl || null, owner_id: viewer.id, usage_rights: rights || null, verification_status: "unverified" },
  });
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}
