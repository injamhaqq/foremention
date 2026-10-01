import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadPlacements, loadWorkspaceContext } from "@/lib/data";
import { loadProjectPlacementScope, placementBelongsToScope } from "@/lib/project-placement-scope";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { queueWorkspaceWebhook } from "@/lib/workspace-event-queue";
import { inngest } from "@/lib/jobs/inngest";

const stages = ["identified", "qualified", "pitched", "accepted", "published", "indexed", "first_cited", "repeatedly_cited", "decayed", "closed"] as const;
const routes = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];

const cleanIds = (value: unknown) => Array.isArray(value)
  ? Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()))).slice(0, 100)
  : [];

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
  const targetPromptIds = cleanIds(body.targetPromptIds);
  const [maps, promptRows] = await Promise.all([
    supabaseRest<Array<{ id: string; run_id: string; run: { project_id: string } | null }>>(
      `source_maps?select=id,run_id,run:runs!inner(project_id)&organization_id=eq.${context.organizationId}&category_id=eq.${context.categoryId}&run.project_id=eq.${context.projectId}&status=eq.published&order=created_at.desc&limit=1`,
      { token: viewer.accessToken },
    ),
    targetPromptIds.length
      ? supabaseRest<Array<{ id: string }>>(
        `prompts?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${targetPromptIds.map((id) => encodeURIComponent(id)).join(",")})&limit=101`,
        { token: viewer.accessToken },
      )
      : Promise.resolve([]),
  ]);
  const sourceMap = maps[0];
  if (!sourceMap?.run_id) return NextResponse.json({ error: "A reviewed Source Map from this project is required before creating an Action." }, { status: 409 });
  if (targetPromptIds.length && promptRows.length !== targetPromptIds.length) {
    return NextResponse.json({ error: "One or more target buyer questions do not belong to the active project." }, { status: 403 });
  }
  const entries = await supabaseRest<Array<{ source_id: string; source: { canonical_url: string; page_title: string | null } | null }>>(
    `source_map_entries?select=source_id,source:sources(canonical_url,page_title)&organization_id=eq.${context.organizationId}&source_map_id=eq.${sourceMap.id}&source_id=eq.${encodeURIComponent(body.sourceId)}&limit=1`,
    { token: viewer.accessToken },
  );
  const entry = entries[0];
  if (!entry?.source) return NextResponse.json({ error: "This source is not part of the active project's reviewed Source Map." }, { status: 403 });
  const rows = await supabaseRest<Array<Record<string, unknown>>>("placements", {
    method: "POST", token: viewer.accessToken, prefer: "return=representation",
    body: { organization_id: context.organizationId, source_id: entry.source_id, source_url: entry.source.canonical_url, page_title: entry.source.page_title, entry_route: body.entryRoute, stage: "identified", owner_id: viewer.id, created_by: viewer.id, target_prompt_ids: targetPromptIds, baseline_run_id: sourceMap.run_id },
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
    if (process.env.INNGEST_EVENT_KEY) await inngest.send({ id: `hubspot-action-${body.id}-${body.stage}`, name: "foremention/integration.hubspot-action", data: { organizationId: context.organizationId, placementId: body.id, eventKey: `action.completed:${body.id}:${body.stage}`, stage: body.stage, occurredAt } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
