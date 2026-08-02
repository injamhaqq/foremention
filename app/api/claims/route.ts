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
    evidenceItemIds?: string[];
    claimText?: string;
    approvedWording?: string;
    limitations?: string;
    publicUse?: boolean;
  };
  const evidenceItemIds = Array.from(new Set((Array.isArray(body.evidenceItemIds) ? body.evidenceItemIds : [body.evidenceItemId]).map((value) => clean(value, 36)).filter(validId))).slice(0, 10);
  const evidenceItemId = evidenceItemIds[0] || "";
  const claimText = clean(body.claimText, 600);
  const approvedWording = clean(body.approvedWording, 600);
  const limitations = clean(body.limitations, 1000);
  const publicUse = body.publicUse === true;
  if (!evidenceItemIds.length || claimText.length < 8 || approvedWording.length < 8 || limitations.length < 3) {
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
    `evidence_items?select=id,title,source_url,usage_rights,verification_status,expires_at&id=in.(${evidenceItemIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=10`,
    { token: viewer.accessToken },
  );
  const item = evidence.find((entry) => entry.id === evidenceItemId);
  const expired = evidence.some((entry) => Boolean(entry.expires_at && new Date(entry.expires_at).getTime() <= Date.now()));
  const invalidEvidence = evidence.length !== evidenceItemIds.length || evidence.some((entry) => entry.verification_status !== "verified" || !entry.source_url || !entry.usage_rights?.trim()) || (publicUse && expired);
  if (!item || invalidEvidence) {
    return NextResponse.json({ error: "Every selected item must be verified evidence from this workspace with a source URL and usage rights." }, { status: 409 });
  }
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
      public_use: false,
      verification_status: "pending",
      verification_note: null,
      verified_by: null,
      verified_at: null,
      expires_at: item.expires_at,
    },
  });
  if (!rows[0]?.id) return NextResponse.json({ error: "The claim could not be persisted." }, { status: 502 });
  try {
    await supabaseRest("verified_claim_evidence", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: evidence.map((entry) => ({ organization_id: context.organizationId, claim_id: rows[0].id, evidence_item_id: entry.id })),
    });
  } catch {
    await supabaseRest(`verified_claims?id=eq.${rows[0].id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "DELETE", token: viewer.accessToken });
    return NextResponse.json({ error: "The evidence links could not be persisted, so the claim was not saved." }, { status: 502 });
  }
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
      after_state: { evidence_item_ids: evidenceItemIds, public_use: false, verification_status: "pending" },
    },
  });
  return NextResponse.json({ data: { ...rows[0], evidenceTitle: item.title, evidenceUrl: item.source_url } }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { evidenceItemIds?: string[] };
  const evidenceItemIds = Array.from(new Set((body.evidenceItemIds || []).map((value) => clean(value, 36)).filter(validId))).slice(0, 10);
  if (!evidenceItemIds.length) return NextResponse.json({ error: "Select at least one verified evidence item." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { claimText: "Northstar HR maintains verified supporting evidence for its security review.", approvedWording: "Documented security evidence is available for review.", limitations: "Fictional demonstration draft; no real company claim is made." } });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can draft claims." }, { status: 403 });
  const evidence = await supabaseRest<Array<{ id: string; title: string; source_url: string | null; usage_rights: string | null; verification_status: string }>>(
    `evidence_items?select=id,title,source_url,usage_rights,verification_status&id=in.(${evidenceItemIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=10`,
    { token: viewer.accessToken },
  );
  if (evidence.length !== evidenceItemIds.length || evidence.some((entry) => entry.verification_status !== "verified" || !entry.source_url || !entry.usage_rights?.trim())) {
    return NextResponse.json({ error: "A draft can use only verified, linkable evidence from this workspace." }, { status: 409 });
  }
  const titles = evidence.map((entry) => entry.title.replace(/[.!?]+$/g, "")).filter(Boolean);
  const subject = titles.length === 1 ? titles[0] : `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
  return NextResponse.json({ data: {
    claimText: `The company maintains verified supporting evidence for ${subject}.`,
    approvedWording: `Documented evidence is available for ${subject}.`,
    limitations: "This draft states only that verified supporting evidence is on file. Review every linked source, its date, scope, and usage rights before publication.",
  } });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; publicUse?: boolean; verificationStatus?: string; verificationNote?: string };
  const id = clean(body.id, 36);
  const verificationStatus = clean(body.verificationStatus, 20);
  const verificationNote = clean(body.verificationNote, 1000);
  const updatesVerification = ["pending", "verified", "disputed"].includes(verificationStatus);
  if (!validId(id) || (!updatesVerification && typeof body.publicUse !== "boolean")) {
    return NextResponse.json({ error: "Choose a valid claim and verification or publication state." }, { status: 400 });
  }
  if (viewer.mode === "demo") return NextResponse.json({ data: { id, publicUse: body.publicUse, verificationStatus: verificationStatus || "verified", verificationNote }, mode: "demo" });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners, admins, and analysts can change claim use." }, { status: 403 });
  const claims = await supabaseRest<Array<{ id: string; evidence_item_id: string | null; public_use: boolean; verification_status: "pending" | "verified" | "disputed" }>>(
    `verified_claims?select=id,evidence_item_id,public_use,verification_status&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const claim = claims[0];
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  const links = await supabaseRest<Array<{ evidence_item_id: string }>>(
    `verified_claim_evidence?select=evidence_item_id&claim_id=eq.${id}&organization_id=eq.${context.organizationId}`,
    { token: viewer.accessToken },
  );
  const evidenceIds = links.map((link) => link.evidence_item_id);
  const evidence = evidenceIds.length ? await supabaseRest<Array<{ id: string; verification_status: string; source_url: string | null; usage_rights: string | null; expires_at: string | null }>>(
    `evidence_items?select=id,verification_status,source_url,usage_rights,expires_at&id=in.(${evidenceIds.join(",")})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
    { token: viewer.accessToken },
  ) : [];
  const evidenceInvalid = evidence.length !== evidenceIds.length || evidence.some((entry) => entry.verification_status !== "verified" || !entry.source_url || !entry.usage_rights?.trim() || Boolean(entry.expires_at && new Date(entry.expires_at).getTime() <= Date.now()));
  if (updatesVerification) {
    if (verificationStatus === "verified" && evidenceInvalid) return NextResponse.json({ error: "Resolve every linked evidence item before verifying this claim." }, { status: 409 });
    const verified = verificationStatus === "verified";
    await Promise.all([
      supabaseRest(`verified_claims?id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, {
        method: "PATCH", token: viewer.accessToken, prefer: "return=minimal",
        body: { verification_status: verificationStatus, verification_note: verificationNote || null, verified_by: verified ? viewer.id : null, verified_at: verified ? new Date().toISOString() : null, ...(verified ? {} : { public_use: false }), updated_at: new Date().toISOString() },
      }),
      supabaseRest("audit_logs", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { organization_id: context.organizationId, actor_id: viewer.id, action: "claim.verification.updated", entity_type: "verified_claim", entity_id: id, before_state: { verification_status: claim.verification_status }, after_state: { verification_status: verificationStatus, verification_note: verificationNote || null } } }),
    ]);
    return NextResponse.json({ data: { id, verificationStatus, verificationNote: verificationNote || null, publicUse: verified ? claim.public_use : false } });
  }
  if (body.publicUse) {
    if (!claim.evidence_item_id || claim.verification_status !== "verified") {
      return NextResponse.json({ error: "Restore and reverify the linked evidence before public use." }, { status: 409 });
    }
    if (evidenceInvalid) {
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
