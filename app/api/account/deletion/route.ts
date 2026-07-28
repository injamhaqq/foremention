import { NextResponse } from "next/server";
import { isRecentAccessToken } from "@/lib/account-security";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPendingDeletionRequest, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadPendingDeletionRequest(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "The fictional demo has no customer account to delete." }, { status: 409 });
  if (!isRecentAccessToken(viewer.accessToken)) {
    return NextResponse.json({
      error: "For your security, sign out and sign in again before requesting account deletion.",
      reauthenticationRequired: true,
    }, { status: 401 });
  }
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can request organization deletion." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as { confirmation?: string; reason?: string };
  if (body.confirmation !== "DELETE FOREMENTION") {
    return NextResponse.json({ error: "Type DELETE FOREMENTION exactly to confirm the request." }, { status: 400 });
  }
  const activeRuns = await supabaseRest<Array<{ id: string }>>(
    `runs?select=id&organization_id=eq.${context.organizationId}&status=in.(queued,running)&limit=1`,
    { serviceRole: true },
  );
  if (activeRuns[0]) {
    return NextResponse.json({ error: "Cancel active collection runs before requesting deletion." }, { status: 409 });
  }
  const existing = await loadPendingDeletionRequest(viewer);
  if (existing) return NextResponse.json({ data: existing, duplicate: true }, { status: 200 });

  const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await supabaseRest<Array<{ id: string; created_at: string }>>("account_deletion_requests", {
    method: "POST",
    serviceRole: true,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      requested_by: viewer.id,
      status: "pending",
      scheduled_for: scheduledFor,
      reason: String(body.reason || "").trim().slice(0, 500) || null,
    },
  });
  const id = rows[0]?.id;
  if (!id) return NextResponse.json({ error: "The deletion request could not be recorded." }, { status: 503 });
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: "account.deletion.requested",
      entity_type: "account_deletion_request",
      entity_id: id,
      after_state: { scheduled_for: scheduledFor, execution_status: "requires_verified_deletion_worker" },
    },
  });
  return NextResponse.json({
    data: { id, status: "pending", scheduledFor },
    execution: "not_active",
    note: "The request is recorded and reversible. No data will be erased until the deletion worker and retention procedure pass production testing.",
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const pending = await loadPendingDeletionRequest(viewer);
  if (!pending) return NextResponse.json({ error: "No pending deletion request was found." }, { status: 404 });
  const cancelledAt = new Date().toISOString();
  await supabaseRest(
    `account_deletion_requests?id=eq.${pending.id}&organization_id=eq.${context.organizationId}&requested_by=eq.${viewer.id}&status=eq.pending`,
    {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { status: "cancelled", cancelled_at: cancelledAt },
    },
  );
  await supabaseRest("audit_logs", {
    method: "POST",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: "account.deletion.cancelled",
      entity_type: "account_deletion_request",
      entity_id: pending.id,
    },
  });
  return NextResponse.json({ ok: true, cancelledAt });
}
