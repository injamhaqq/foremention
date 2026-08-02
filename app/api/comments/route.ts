import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const entityTypes = ["source_map_entry", "priority_gap", "evidence_item"] as const;
type EntityType = typeof entityTypes[number];
const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

async function targetExists(entityType: EntityType, entityId: string, organizationId: string, token: string) {
  const table = entityType === "evidence_item" ? "evidence_items" : "source_map_entries";
  const rows = await supabaseRest<Array<{ id: string }>>(`${table}?select=id&id=eq.${entityId}&organization_id=eq.${organizationId}&limit=1`, { token });
  return Boolean(rows[0]);
}

async function contextFor(request: Request) {
  const viewer = await getViewer(); if (!viewer) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (viewer.mode === "demo") return { viewer, demo: true };
  const context = await loadWorkspaceContext(viewer); if (!context) return { response: NextResponse.json({ error: "Workspace not found." }, { status: 404 }) };
  const url = new URL(request.url); const entityType = url.searchParams.get("entityType") as EntityType | null; const entityId = url.searchParams.get("entityId") || "";
  if (!entityType || !entityTypes.includes(entityType) || !uuid.test(entityId)) return { response: NextResponse.json({ error: "Choose a valid workspace record." }, { status: 400 }) };
  if (!await targetExists(entityType, entityId, context.organizationId, viewer.accessToken!)) return { response: NextResponse.json({ error: "Workspace record not found." }, { status: 404 }) };
  return { viewer, context, entityType, entityId };
}

export async function GET(request: Request) {
  const resolved = await contextFor(request); if (resolved.response) return resolved.response;
  if (resolved.demo) return NextResponse.json({ data: [], mode: "demo" });
  const rows = await supabaseRest<Array<{ id: string; author_id: string; body: string; created_at: string }>>(`workspace_comments?select=id,author_id,body,created_at&organization_id=eq.${resolved.context!.organizationId}&entity_type=eq.${resolved.entityType}&entity_id=eq.${resolved.entityId}&order=created_at.asc&limit=100`, { token: resolved.viewer!.accessToken });
  return NextResponse.json({ data: rows.map((row) => ({ id: row.id, body: row.body, createdAt: row.created_at, own: row.author_id === resolved.viewer!.id, author: row.author_id === resolved.viewer!.id ? "You" : "Teammate" })) });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const resolved = await contextFor(request); if (resolved.response) return resolved.response;
  if (resolved.demo) return NextResponse.json({ data: { id: crypto.randomUUID(), body: "Demo comment", own: true, author: "You", createdAt: new Date().toISOString() }, mode: "demo" }, { status: 201 });
  const body = await request.json().catch(() => ({})) as { body?: string }; const comment = String(body.body || "").trim().slice(0, 2000);
  if (!comment) return NextResponse.json({ error: "Write a comment before posting." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string; created_at: string }>>("workspace_comments", { method: "POST", token: resolved.viewer!.accessToken, prefer: "return=representation", body: { organization_id: resolved.context!.organizationId, entity_type: resolved.entityType, entity_id: resolved.entityId, author_id: resolved.viewer!.id, body: comment } });
  const row = rows[0]; if (!row) return NextResponse.json({ error: "The comment could not be saved." }, { status: 503 });
  return NextResponse.json({ data: { id: row.id, body: comment, createdAt: row.created_at, own: true, author: "You" } }, { status: 201 });
}
