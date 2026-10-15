import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { billingProvider } from "@/lib/billing-provider";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { CheckoutRecoveryUnavailableError, recoverOrganizationCheckout } from "@/lib/paddle-checkout-recovery";
import { isTrustedMutationOrigin } from "@/lib/request-security";

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

  try {
    const result = await recoverOrganizationCheckout(provider, context.organizationId);
    return NextResponse.json({ data: { action: result.action, reason: result.reason } }, { status: result.status });
  } catch (error) {
    const message = error instanceof CheckoutRecoveryUnavailableError ? error.message : "Checkout reconciliation could not be completed. Contact support.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
