import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { webhookSecretForDisplay, validateWebhookDestination, WORKSPACE_WEBHOOK_EVENTS, type WorkspaceWebhookEvent } from "@/lib/workspace-webhooks";

export async function GET() {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" });
  const context = await loadWorkspaceContext(viewer); if (!context) return NextResponse.json({ data: [] });
  const rows = await supabaseRest(`workspace_webhook_endpoints?select=id,label,destination_url,event_types,active,secret_hint,created_at&organization_id=eq.${context.organizationId}&order=created_at.desc`, { token: viewer.accessToken });
  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Webhooks are disabled in the fictional demo." }, { status: 409 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!role || !["owner", "admin"].includes(role)) return NextResponse.json({ error: "Only owners and admins can create webhooks." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { label?: string; url?: string; events?: string[] };
  const label = String(body.label || "").trim().slice(0, 80); if (!label) return NextResponse.json({ error: "Name this webhook." }, { status: 400 });
  let destinationUrl = ""; try { destinationUrl = validateWebhookDestination(String(body.url || "")); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Enter a public HTTPS URL." }, { status: 400 }); }
  const eventTypes = Array.from(new Set((body.events || []).filter((event): event is WorkspaceWebhookEvent => WORKSPACE_WEBHOOK_EVENTS.includes(event as WorkspaceWebhookEvent))));
  if (!eventTypes.length) return NextResponse.json({ error: "Choose at least one event." }, { status: 400 });
  const masterSecret = process.env.WEBHOOK_SIGNING_SECRET; if (!masterSecret) return NextResponse.json({ error: "Webhook signing is not configured." }, { status: 503 });
  const id = crypto.randomUUID(); const signingSecret = await webhookSecretForDisplay(id, masterSecret); const secretHint = signingSecret.slice(-6);
  await supabaseRest("workspace_webhook_endpoints", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { id, organization_id: context.organizationId, label, destination_url: destinationUrl, event_types: eventTypes, secret_hint: secretHint, created_by: viewer.id } });
  return NextResponse.json({ data: { id, label, destinationUrl, eventTypes, signingSecret, secretShownOnce: true } }, { status: 201 });
}
