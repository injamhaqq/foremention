import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadEvidence, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { queueWorkspaceWebhook } from "@/lib/workspace-event-queue";

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
    try {
      if (new URL(sourceUrl).protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      return NextResponse.json({ error: "Use a complete evidence URL beginning with https://." }, { status: 400 });
    }
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

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: "verified" | "unverified" };
  const id = clean(body.id, 36);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !body.status || !["verified", "unverified"].includes(body.status)) {
    return NextResponse.json({ error: "Choose a valid evidence item and review state." }, { status: 400 });
  }
  if (viewer.mode === "demo") return NextResponse.json({ data: { id, status: body.status, verifiedAt: body.status === "verified" ? new Date().toISOString() : null }, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can review evidence." }, { status: 403 });
  const rows = await supabaseRest<Array<{ id: string; source_url: string | null; usage_rights: string | null; verification_status: string }>>(
    `evidence_items?select=id,source_url,usage_rights,verification_status&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const item = rows[0];
  if (!item) return NextResponse.json({ error: "Evidence item not found." }, { status: 404 });
  if (body.status === "verified" && (!item.source_url || !item.usage_rights?.trim())) {
    return NextResponse.json({ error: "Add a supporting HTTPS URL and usage rights before verification." }, { status: 409 });
  }
  const verifiedAt = body.status === "verified" ? new Date().toISOString() : null;
  await Promise.all([
    supabaseRest(
      `evidence_items?id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
      { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { verification_status: body.status, verified_at: verifiedAt } },
    ),
    supabaseRest("audit_logs", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        actor_id: viewer.id,
        action: body.status === "verified" ? "evidence.verified" : "evidence.reopened",
        entity_type: "evidence_item",
        entity_id: id,
        before_state: { verification_status: item.verification_status },
        after_state: { verification_status: body.status },
      },
    }),
  ]);
  if (body.status === "verified") await queueWorkspaceWebhook({ organizationId: context.organizationId, eventKey: `evidence.reviewed:${id}:${verifiedAt}`, eventType: "evidence.reviewed", occurredAt: verifiedAt!, href: "/app/evidence" }).catch(() => undefined);
  return NextResponse.json({ data: { id, status: body.status, verifiedAt } });
}
