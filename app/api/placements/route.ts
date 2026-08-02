import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadPlacements, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { queueWorkspaceWebhook } from "@/lib/workspace-event-queue";

const stages = ["identified", "qualified", "pitched", "accepted", "published", "indexed", "first_cited", "repeatedly_cited", "decayed", "closed"] as const;
const routes = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadPlacements(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { sourceId?: string; entryRoute?: string; targetPromptIds?: string[] };
  if (!body.sourceId || !body.entryRoute || !routes.includes(body.entryRoute)) return NextResponse.json({ error: "A mapped source and legitimate route are required." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), stage: "identified" }, mode: "demo" }, { status: 201 });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const sources = await supabaseRest<Array<{ id: string; canonical_url: string; page_title: string | null }>>(
    `sources?select=id,canonical_url,page_title&id=eq.${body.sourceId}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const source = sources[0];
  if (!source) return NextResponse.json({ error: "This source does not belong to your workspace." }, { status: 403 });
  const rows = await supabaseRest<Array<Record<string, unknown>>>("placements", {
    method: "POST", token: viewer.accessToken, prefer: "return=representation",
    body: { organization_id: context.organizationId, source_id: source.id, source_url: source.canonical_url, page_title: source.page_title, entry_route: body.entryRoute, stage: "identified", owner_id: viewer.id, created_by: viewer.id, target_prompt_ids: (body.targetPromptIds || []).slice(0, 100) },
  });
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { id?: string; stage?: typeof stages[number]; note?: string; evidenceUrl?: string };
  if (!body.id || !body.stage || !stages.includes(body.stage)) return NextResponse.json({ error: "Action ID and valid stage are required." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const current = await supabaseRest<Array<{ id: string; stage: typeof stages[number] }>>(
    `placements?select=id,stage&id=eq.${body.id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  if (!current[0]) return NextResponse.json({ error: "Action not found." }, { status: 404 });
  await Promise.all([
    supabaseRest(`placements?id=eq.${body.id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { stage: body.stage } }),
    supabaseRest("placement_events", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { organization_id: context.organizationId, placement_id: body.id, from_stage: current[0].stage, to_stage: body.stage, note: String(body.note || "").trim().slice(0, 1000) || null, evidence_url: String(body.evidenceUrl || "").trim().slice(0, 1000) || null, actor_id: viewer.id } }),
  ]);
  if (["published", "indexed", "first_cited", "repeatedly_cited", "closed"].includes(body.stage)) {
    const occurredAt = new Date().toISOString();
    await queueWorkspaceWebhook({ organizationId: context.organizationId, eventKey: `action.completed:${body.id}:${body.stage}`, eventType: "action.completed", occurredAt, href: "/app/placements" }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
