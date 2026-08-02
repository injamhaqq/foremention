import { NextResponse } from "next/server";
import { isRecentAccessToken } from "@/lib/account-security";
import { sendProductAlertEmail } from "@/lib/application-email";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPendingDeletionRequest, loadWorkspaceContext } from "@/lib/data";
import { inngest } from "@/lib/jobs/inngest";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { clearSessionCookies } from "@/lib/session-cookies";
import { revokeAllSupabaseSessions } from "@/lib/session-revocation";
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
      after_state: { scheduled_for: scheduledFor, execution_status: "owner_confirmation_required_after_safety_window" },
    },
  });
  return NextResponse.json({
    data: { id, status: "pending", scheduledFor },
    execution: "scheduled",
    note: "The request is recorded and reversible for seven days. After that date, the owner must reauthenticate and confirm deletion a second time.",
  }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer || viewer.mode === "demo" || !viewer.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecentAccessToken(viewer.accessToken)) return NextResponse.json({ error: "Sign out and sign in again before permanently deleting this workspace.", reauthenticationRequired: true }, { status: 401 });
  const [context, role, pending] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer), loadPendingDeletionRequest(viewer)]);
  if (!context || !pending) return NextResponse.json({ error: "Pending deletion request not found." }, { status: 404 });
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can permanently delete the organization." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { confirmation?: string; exportAcknowledged?: boolean };
  if (body.confirmation !== `DELETE ${context.organizationName}` || body.exportAcknowledged !== true) return NextResponse.json({ error: `Download your export, then type DELETE ${context.organizationName} exactly.` }, { status: 400 });
  if (Date.parse(pending.scheduledAt) > Date.now()) return NextResponse.json({ error: "The seven-day safety window is still active." }, { status: 409 });

  const activeRuns = await supabaseRest<Array<{ id: string }>>(`runs?select=id&organization_id=eq.${context.organizationId}&status=in.(queued,running)`, { serviceRole: true });
  if (process.env.INNGEST_EVENT_KEY) await Promise.all(activeRuns.map((run) => inngest.send({ id: `foremention-run-cancelled-deletion-${run.id}`, name: "foremention/run.cancelled", data: { runId: run.id, organizationId: context.organizationId } }).catch(() => undefined)));

  const rows = await supabaseRest<Array<{ receipt_id: string }>>("rpc/execute_foremention_account_deletion", {
    method: "POST",
    serviceRole: true,
    body: { p_request_id: pending.id, p_requested_by: viewer.id },
  });
  const receiptId = rows[0]?.receipt_id;
  if (!receiptId) return NextResponse.json({ error: "The deletion procedure did not return a completion receipt." }, { status: 503 });

  const sessionsRevoked = await revokeAllSupabaseSessions(viewer.accessToken).catch(() => false);
  let emailStatus: "sent" | "not_configured" | "failed" = "failed";
  try {
    await sendProductAlertEmail({ to: viewer.email, subject: "Your Foremention workspace was deleted", text: "Your Foremention organization and its customer records were permanently deleted after the seven-day safety window and your second owner confirmation. Authentication and application-email systems are operated separately; contact hello@foremention.com if you need the non-identifying deletion receipt reviewed." });
    emailStatus = "sent";
  } catch (error) {
    emailStatus = error instanceof Error && error.message.includes("not configured") ? "not_configured" : "failed";
  }
  await supabaseRest(`data_deletion_receipts?id=eq.${receiptId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { email_delivery_status: emailStatus, session_revocation_status: sessionsRevoked ? "revoked" : "failed" } }).catch(() => undefined);

  const response = NextResponse.json({ ok: true, receiptId, emailStatus, sessionsRevoked });
  clearSessionCookies(response);
  return response;
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, mode: "demo" });
  if (!isRecentAccessToken(viewer.accessToken)) return NextResponse.json({ error: "Sign out and sign in again before cancelling a deletion request." }, { status: 401 });
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
