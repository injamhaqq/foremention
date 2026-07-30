import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadVerifiedClaims, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadVerifiedClaims(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    evidenceItemId?: string;
    claimText?: string;
    approvedWording?: string;
    limitations?: string;
    publicUse?: boolean;
  };
  const evidenceItemId = clean(body.evidenceItemId, 36);
  const claimText = clean(body.claimText, 600);
  const approvedWording = clean(body.approvedWording, 600);
  const limitations = clean(body.limitations, 1000);
  const publicUse = body.publicUse === true;
  if (!validId(evidenceItemId) || claimText.length < 8 || approvedWording.length < 8 || limitations.length < 3) {
    return NextResponse.json({ error: "Choose verified evidence and record the observed claim, approved wording, and limitations." }, { status: 400 });
  }
  if (viewer.mode === "demo") {
    return NextResponse.json({
      data: { id: crypto.randomUUID(), evidenceItemId, claimText, approvedWording, limitations, publicUse, verifiedAt: new Date().toISOString() },
      mode: "demo",
    }, { status: 201 });
  }
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can approve claims." }, { status: 403 });
  const evidence = await supabaseRest<Array<{
    id: string;
    title: string;
    source_url: string | null;
    usage_rights: string | null;
    verification_status: string;
    expires_at: string | null;
  }>>(
    `evidence_items?select=id,title,source_url,usage_rights,verification_status,expires_at&id=eq.${encodeURIComponent(evidenceItemId)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const item = evidence[0];
  const expired = Boolean(item?.expires_at && new Date(item.expires_at).getTime() <= Date.now());
  if (!item || item.verification_status !== "verified" || !item.source_url || !item.usage_rights?.trim() || (publicUse && expired)) {
    return NextResponse.json({ error: "This claim needs a verified evidence item with a source URL and usage rights." }, { status: 409 });
  }
  const verifiedAt = new Date().toISOString();
  const rows = await supabaseRest<Array<{ id: string } & Record<string, unknown>>>("verified_claims", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      project_id: context.projectId,
      evidence_item_id: item.id,
      claim_text: claimText,
      approved_wording: approvedWording,
      limitations,
      public_use: publicUse,
      verified_by: viewer.id,
      verified_at: verifiedAt,
      expires_at: item.expires_at,
    },
  });
  if (!rows[0]?.id) return NextResponse.json({ error: "The claim could not be persisted." }, { status: 502 });
  await supabaseRest("audit_logs", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: "claim.approved",
      entity_type: "verified_claim",
      entity_id: rows[0]?.id,
      after_state: { evidence_item_id: item.id, public_use: publicUse },
    },
  });
  return NextResponse.json({ data: { ...rows[0], evidenceTitle: item.title, evidenceUrl: item.source_url } }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; publicUse?: boolean };
  const id = clean(body.id, 36);
  if (!validId(id) || typeof body.publicUse !== "boolean") {
    return NextResponse.json({ error: "Choose a valid claim and publication state." }, { status: 400 });
  }
  if (viewer.mode === "demo") return NextResponse.json({ data: { id, publicUse: body.publicUse }, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can change claim use." }, { status: 403 });
  const claims = await supabaseRest<Array<{ id: string; evidence_item_id: string | null; public_use: boolean }>>(
    `verified_claims?select=id,evidence_item_id,public_use&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const claim = claims[0];
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  if (body.publicUse) {
    if (!claim.evidence_item_id) {
      return NextResponse.json({ error: "Restore and reverify the linked evidence before public use." }, { status: 409 });
    }
    const evidence = await supabaseRest<Array<{ verification_status: string; source_url: string | null; usage_rights: string | null; expires_at: string | null }>>(
      `evidence_items?select=verification_status,source_url,usage_rights,expires_at&id=eq.${encodeURIComponent(claim.evidence_item_id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    );
    const item = evidence[0];
    const expired = Boolean(item?.expires_at && new Date(item.expires_at).getTime() <= Date.now());
    if (!item || item.verification_status !== "verified" || !item.source_url || !item.usage_rights?.trim() || expired) {
      return NextResponse.json({ error: "Reverify the linked evidence before approving this claim for public use." }, { status: 409 });
    }
  }
  await Promise.all([
    supabaseRest(
      `verified_claims?id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
      { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { public_use: body.publicUse, updated_at: new Date().toISOString() } },
    ),
    supabaseRest("audit_logs", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        actor_id: viewer.id,
        action: body.publicUse ? "claim.public_use_enabled" : "claim.public_use_disabled",
        entity_type: "verified_claim",
        entity_id: id,
        before_state: { public_use: claim.public_use },
        after_state: { public_use: body.publicUse },
      },
    }),
  ]);
  return NextResponse.json({ data: { id, publicUse: body.publicUse } });
}
