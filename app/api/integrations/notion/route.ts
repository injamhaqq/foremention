import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { notionOAuthReady } from "@/lib/notion-connector";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const pageId = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function contextAndRole() { const viewer = await getViewer(); if (!viewer) return null; return { viewer, context: await loadWorkspaceContext(viewer), role: await getPrimaryWorkspaceRole(viewer) }; }

export async function GET() {
  const current = await contextAndRole(); if (!current?.context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (current.viewer.mode === "demo") return NextResponse.json({ data: { configured: false, connected: false } });
  const rows = await supabaseRest<Array<{ status: string; configuration: Record<string, unknown> }>>(`integrations?select=status,configuration&organization_id=eq.${current.context.organizationId}&project_id=eq.${current.context.projectId}&provider=eq.notion&limit=1`, { token: current.viewer.accessToken });
  return NextResponse.json({ data: { configured: notionOAuthReady(), connected: rows[0]?.status === "connected", parentPageId: String(rows[0]?.configuration?.parent_page_id || ""), workspaceName: String(rows[0]?.configuration?.workspace_name || "") } });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const current = await contextAndRole(); if (!current?.context || current.viewer.mode === "demo") return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (current.role !== "owner" && current.role !== "admin") return NextResponse.json({ error: "Only an owner or admin can configure Notion." }, { status: 403 });
  const body = await request.json() as { parentPageId?: string }; const parentPageId = String(body.parentPageId || "").trim(); if (!pageId.test(parentPageId)) return NextResponse.json({ error: "Enter a valid Notion page ID shared with the integration." }, { status: 400 });
  const rows = await supabaseRest<Array<{ id: string; configuration: Record<string, unknown> }>>(`integrations?select=id,configuration&organization_id=eq.${current.context.organizationId}&project_id=eq.${current.context.projectId}&provider=eq.notion&status=eq.connected&limit=1`, { token: current.viewer.accessToken });
  if (!rows[0]) return NextResponse.json({ error: "Connect Notion before choosing an export page." }, { status: 409 });
  await supabaseRest(`integrations?id=eq.${rows[0].id}&organization_id=eq.${current.context.organizationId}`, { method: "PATCH", token: current.viewer.accessToken, prefer: "return=minimal", body: { configuration: { ...rows[0].configuration, parent_page_id: parentPageId }, updated_at: new Date().toISOString() } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const current = await contextAndRole(); if (!current?.context || current.viewer.mode === "demo") return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (current.role !== "owner" && current.role !== "admin") return NextResponse.json({ error: "Only an owner or admin can disconnect Notion." }, { status: 403 });
  const rows = await supabaseRest<Array<{ id: string }>>(`integrations?select=id&organization_id=eq.${current.context.organizationId}&project_id=eq.${current.context.projectId}&provider=eq.notion&limit=1`, { token: current.viewer.accessToken });
  if (rows[0]) { await supabaseRest(`integration_credentials?integration_id=eq.${rows[0].id}`, { method: "DELETE", serviceRole: true }); await supabaseRest(`integrations?id=eq.${rows[0].id}&organization_id=eq.${current.context.organizationId}`, { method: "PATCH", token: current.viewer.accessToken, prefer: "return=minimal", body: { status: "revoked", configuration: {} } }); }
  return NextResponse.json({ ok: true });
}
