import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { hubSpotOAuthReady } from "@/lib/hubspot-connector";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { configured: false, connected: false } });
  const context = await loadWorkspaceContext(viewer); if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const rows = await supabaseRest<Array<{ status: string; connected_at: string | null; last_synced_at: string | null }>>(`integrations?select=status,connected_at,last_synced_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&provider=eq.hubspot&limit=1`, { token: viewer.accessToken });
  return NextResponse.json({ data: { configured: hubSpotOAuthReady(), connected: rows[0]?.status === "connected", connectedAt: rows[0]?.connected_at || null, lastSyncedAt: rows[0]?.last_synced_at || null } });
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer(); if (!viewer || viewer.mode === "demo") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Only an owner or admin can disconnect HubSpot." }, { status: 403 });
  const rows = await supabaseRest<Array<{ id: string }>>(`integrations?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&provider=eq.hubspot&limit=1`, { token: viewer.accessToken });
  if (rows[0]) {
    await supabaseRest(`integration_credentials?integration_id=eq.${rows[0].id}`, { method: "DELETE", serviceRole: true });
    await supabaseRest(`integrations?id=eq.${rows[0].id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { status: "revoked", configuration: {}, last_synced_at: new Date().toISOString() } });
  }
  return NextResponse.json({ ok: true });
}
