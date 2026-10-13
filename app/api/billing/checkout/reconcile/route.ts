import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { decidePaddleReservation, type CheckoutReservation } from "@/lib/paddle-checkout-reconciliation";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

/**
 * Chat03 (A02/CV-06): owner-triggered recovery of this workspace's single
 * unresolved Paddle checkout reservation. It never grants entitlement — paid
 * access is applied only by the signed transaction.completed webhook. It can
 * record an already-paid reservation as settled, cancel an abandoned
 * (never-paid) Foremention checkout and release it, release a canceled one,
 * or report that operator review is required.
 *
 * Depends on FM-00 migration proposal
 * docs/execution/attach-v1/03-proposals/migrations/20261013090000_billing_checkout_reservation_settlement.sql
 * (settle_paddle_checkout_reservation / release_paddle_checkout_reservation).
 * Until it is applied the RPC calls fail and this route answers 503.
 */
export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const provider = billingProvider();
  if (!provider?.configured() || provider.id !== "paddle"
    || !provider.getCheckoutTransaction || !provider.cancelCheckoutTransaction) {
    return NextResponse.json({ error: "Paddle checkout reconciliation is not configured." }, { status: 503 });
  }
  const viewer = await requireViewer("/app/settings");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Demo workspaces cannot reconcile billing." }, { status: 403 });
  let role: Awaited<ReturnType<typeof getPrimaryWorkspaceRole>>;
  let context: Awaited<ReturnType<typeof loadWorkspaceContext>>;
  try {
    [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  } catch {
    return NextResponse.json({ error: "Workspace authorization could not be verified." }, { status: 503 });
  }
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can reconcile checkout." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  let rows: CheckoutReservation[];
  try {
    rows = await supabaseRest<CheckoutReservation[]>(
      "billing_checkout_reservations?select=id,organization_id,package_key,billing_interval,state,external_transaction_id,created_at"
      + "&provider=eq.paddle&state=neq.reconciled"
      + "&organization_id=eq." + encodeURIComponent(context.organizationId)
      + "&limit=2",
      { serviceRole: true },
    );
  } catch {
    return NextResponse.json({ error: "Checkout reservation could not be read." }, { status: 503 });
  }
  if (rows.length === 0) return NextResponse.json({ data: { action: "none", reason: "no_unresolved_checkout" } });
  if (rows.length > 1) return NextResponse.json({ data: { action: "manual_review", reason: "multiple_unresolved_checkouts" } }, { status: 409 });
  const reservation = rows[0];

  let transaction: unknown = null;
  try {
    if (reservation.external_transaction_id && reservation.state !== "uncertain") {
      transaction = await provider.getCheckoutTransaction(reservation.external_transaction_id);
    }
  } catch {
    return NextResponse.json({ error: "Paddle checkout status could not be read. Try again later." }, { status: 503 });
  }

  const decision = decidePaddleReservation(reservation, transaction);
  const body = (status = 200) => NextResponse.json({ data: { action: decision.action, reason: decision.reason } }, { status });
  if (decision.action === "none" || decision.action === "keep" || decision.action === "await_provider") return body();
  if (decision.action === "manual_review") return body(409);

  try {
    if (decision.action === "cancel_then_release") {
      const status = await provider.cancelCheckoutTransaction(reservation.external_transaction_id as string);
      // Confirm with a fresh read: a payment racing the cancel must win.
      const after = await provider.getCheckoutTransaction(reservation.external_transaction_id as string);
      const afterDecision = decidePaddleReservation(reservation, after);
      if (status !== "canceled" || afterDecision.action !== "release") {
        return NextResponse.json({ data: { action: "manual_review", reason: "cancel_not_confirmed" } }, { status: 409 });
      }
    }
    const rpc = decision.action === "settle_paid" ? "rpc/settle_paddle_checkout_reservation" : "rpc/release_paddle_checkout_reservation";
    const ok = await supabaseRest<boolean>(rpc, {
      method: "POST",
      serviceRole: true,
      body: decision.action === "settle_paid"
        ? { p_organization_id: context.organizationId, p_transaction_id: reservation.external_transaction_id, p_evidence: decision.evidence }
        : { p_reservation_id: reservation.id, p_organization_id: context.organizationId, p_evidence: decision.evidence },
    });
    if (!ok) return NextResponse.json({ data: { action: "manual_review", reason: "reservation_state_changed" } }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Checkout reconciliation could not be completed. Contact support." }, { status: 503 });
  }
  return body();
}
