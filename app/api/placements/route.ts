import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadPlacements, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { loadProjectPlacementScope, placementBelongsToScope } from "@/lib/project-placement-scope";
import { loadLatestProjectSourceMapRef } from "@/lib/project-source-map-scope";
import { supabaseRest } from "@/lib/supabase-rest";
import { queueWorkspaceWebhook } from "@/lib/workspace-event-queue";
import { inngest } from "@/lib/jobs/inngest";

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
  const sourceMap = await loadLatestProjectSourceMapRef({
    organizationId: context.organizationId,
    projectId: context.projectId,
    categoryId: context.categoryId,
    token: viewer.accessToken,
  });
  if (!sourceMap) return NextResponse.json({ error: "No reviewed source map exists for the active project." }, { status: 409 });
  const entries = await supabaseRest<Array<{ source_id: string; source: { id: string; canonical_url: string; page_title: string | null } | null }>>(
    `source_map_entries?select=source_id,source:sources(id,canonical_url,page_title)&organization_id=eq.${context.organizationId}&source_map_id=eq.${sourceMap.id}&source_id=eq.${encodeURIComponent(body.sourceId)}&limit=1`,
    { token: viewer.accessToken },
  );
  const source = entries[0]?.source;
  if (!source || entries[0].source_id !== body.sourceId) return NextResponse.json({ error: "This source does not belong to the active project evidence set." }, { status: 403 });

  const requestedPromptIds = Array.from(new Set((body.targetPromptIds || []).slice(0, 100)));
  if (requestedPromptIds.length) {
    const scopedPrompts = await supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${requestedPromptIds.join(",")})&limit=100`,
      { token: viewer.accessToken },
    );
    if (scopedPrompts.length !== requestedPromptIds.length) return NextResponse.json({ error: "Every linked buyer question must belong to the active project." }, { status: 403 });
  }

  const rows = await supabaseRest<Array<Record<string, unknown>>>("placements", {
    method: "POST", token: viewer.accessToken, prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      source_id: source.id,
      source_url: source.canonical_url,
      page_title: source.page_title,
      entry_route: body.entryRoute,
      stage: "identified",
      owner_id: viewer.id,
      created_by: viewer.id,
      target_prompt_ids: requestedPromptIds,
      baseline_run_id: sourceMap.runId,
    },
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
  const placementScope = await loadProjectPlacementScope({
    organizationId: context.organizationId,
    projectId: context.projectId,
    token: viewer.accessToken,
  });
  if (!placementScope) return NextResponse.json({ error: "Active project scope is unavailable." }, { status: 409 });
  const current = await supabaseRest<Array<{ id: string; stage: typeof stages[number]; target_prompt_ids: string[] | null; baseline_run_id: string | null; remeasurement_run_id: string | null }>>(
    `placements?select=id,stage,target_prompt_ids,baseline_run_id,remeasurement_run_id&id=eq.${body.id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  if (!current[0] || !placementBelongsToScope(current[0], placementScope)) return NextResponse.json({ error: "Action not found in the active project." }, { status: 404 });
  await Promise.all([
    supabaseRest(`placements?id=eq.${body.id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { stage: body.stage } }),
    supabaseRest("placement_events", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { organization_id: context.organizationId, placement_id: body.id, from_stage: current[0].stage, to_stage: body.stage, note: String(body.note || "").trim().slice(0, 1000) || null, evidence_url: String(body.evidenceUrl || "").trim().slice(0, 1000) || null, actor_id: viewer.id } }),
  ]);
  if (["published", "indexed", "first_cited", "repeatedly_cited", "closed"].includes(body.stage)) {
    const occurredAt = new Date().toISOString();
    await queueWorkspaceWebhook({ organizationId: context.organizationId, projectId: context.projectId, eventKey: `action.completed:${body.id}:${body.stage}`, eventType: "action.completed", occurredAt, href: "/app/placements" }).catch(() => undefined);
    if (process.env.INNGEST_EVENT_KEY) await inngest.send({ id: `hubspot-action-${body.id}-${body.stage}`, name: "foremention/integration.hubspot-action", data: { organizationId: context.organizationId, projectId: context.projectId, placementId: body.id, eventKey: `action.completed:${body.id}:${body.stage}`, stage: body.stage, occurredAt } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
