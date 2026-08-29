import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { captureProductEvent } from "@/lib/product-analytics";
import { createRecordShareToken, hashRecordShareToken, recordShareExpiry, safeRecordSharePath } from "@/lib/record-sharing";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const canShare = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");

type ShareRow = { id: string; expires_at: string; revoked_at: string | null; include_evidence: boolean };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/runs");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canShare(role)) return NextResponse.json({ error: "Your workspace role cannot share Recommendation Records." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { includeEvidence?: boolean; expiresInDays?: number };
  const run = (await loadRuns(viewer)).find((item) => item.id === id);
  if (!run) return NextResponse.json({ error: "Recommendation Record not found." }, { status: 404 });
  if (!["complete", "partial", "review"].includes(run.status)) return NextResponse.json({ error: "Only an observed or reviewed Recommendation Record can be shared." }, { status: 409 });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const token = createRecordShareToken();
  const tokenHash = await hashRecordShareToken(token);
  const expiresAt = recordShareExpiry(body.expiresInDays).toISOString();
  if (viewer.mode !== "demo") {
    await supabaseRest("record_shares", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        run_id: run.id,
        token_hash: tokenHash,
        include_evidence: body.includeEvidence !== false,
        created_by: viewer.id,
        expires_at: expiresAt,
      },
    });
  }
  // Never persist or log the raw token. It is returned exactly once to the creator.
  return NextResponse.json({ data: { path: safeRecordSharePath(token), expiresAt, includeEvidence: body.includeEvidence !== false }, mode: viewer.mode }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/runs");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canShare(role)) return NextResponse.json({ error: "Your workspace role cannot revoke Recommendation Record shares." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { shareId?: string };
  if (!body.shareId) return NextResponse.json({ error: "Share id is required." }, { status: 400 });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (viewer.mode !== "demo") {
    const rows = await supabaseRest<ShareRow[]>(`record_shares?id=eq.${encodeURIComponent(body.shareId)}&run_id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}`, {
      method: "PATCH",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: { revoked_at: new Date().toISOString() },
    });
    if (!rows.length) return NextResponse.json({ error: "Share not found." }, { status: 404 });
  }
  return NextResponse.json({ data: { revoked: true }, mode: viewer.mode });
}
