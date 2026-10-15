/**
 * Shared Paddle checkout recovery used by the owner's "Check checkout status"
 * button (/api/billing/checkout/reconcile) and by /api/billing/checkout itself,
 * so a stale or failed checkout no longer locks the workspace out of paying.
 *
 * It never grants entitlement. Paid access only comes from the signed
 * transaction.completed webhook.
 */
import type { BillingProviderAdapter } from "./billing-provider.ts";
import {
  decidePaddleReservation,
  decideUnknownReservation,
  reservationIdentityUnknown,
  unknownReservationSearchDue,
  type CheckoutReservation,
  type ReconciliationAction,
} from "./paddle-checkout-reconciliation.ts";
import { supabaseRest } from "./supabase-rest.ts";

export type CheckoutRecoveryResult = {
  action: ReconciliationAction;
  reason: string;
  /** HTTP status the reconcile route answers with. */
  status: number;
  /** The still-open checkout link when action is "keep" (never persisted elsewhere). */
  checkoutUrl?: string | null;
  /** The held checkout's offer, so a resumed link is only reused for the same offer. */
  packageKey?: string;
  billingInterval?: string;
};

type ReservationRow = CheckoutReservation & { checkout_url?: string | null };

const HTTPS = /^https:\/\//i;

export class CheckoutRecoveryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutRecoveryUnavailableError";
  }
}

async function releaseUnknownReservation(reservation: ReservationRow, evidence: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(
    "billing_checkout_reservations?id=eq." + encodeURIComponent(reservation.id)
      + "&organization_id=eq." + encodeURIComponent(reservation.organization_id)
      + "&provider=eq.paddle&state=in.(reserved,uncertain)&external_transaction_id=is.null&select=id",
    { method: "PATCH", serviceRole: true, prefer: "return=representation", body: { state: "reconciled", reconciliation_evidence: evidence } },
  );
  return Array.isArray(rows) && rows.length === 1;
}

async function adoptTransaction(reservation: ReservationRow, transactionId: string, checkoutUrl: string) {
  const rows = await supabaseRest<Array<{ id: string }>>(
    "billing_checkout_reservations?id=eq." + encodeURIComponent(reservation.id)
      + "&organization_id=eq." + encodeURIComponent(reservation.organization_id)
      + "&provider=eq.paddle&state=in.(reserved,uncertain)&external_transaction_id=is.null&select=id",
    { method: "PATCH", serviceRole: true, prefer: "return=representation", body: { state: "ready", external_transaction_id: transactionId, checkout_url: checkoutUrl } },
  );
  return Array.isArray(rows) && rows.length === 1;
}

export async function recoverOrganizationCheckout(
  provider: BillingProviderAdapter,
  organizationId: string,
  now = new Date(),
): Promise<CheckoutRecoveryResult> {
  if (!provider.getCheckoutTransaction || !provider.cancelCheckoutTransaction) {
    throw new CheckoutRecoveryUnavailableError("Paddle checkout reconciliation is not configured.");
  }
  let rows: ReservationRow[];
  try {
    rows = await supabaseRest<ReservationRow[]>(
      "billing_checkout_reservations?select=id,organization_id,package_key,billing_interval,state,external_transaction_id,checkout_url,created_at"
      + "&provider=eq.paddle&state=neq.reconciled"
      + "&organization_id=eq." + encodeURIComponent(organizationId)
      + "&limit=2",
      { serviceRole: true },
    );
  } catch {
    throw new CheckoutRecoveryUnavailableError("Checkout reservation could not be read.");
  }
  if (rows.length === 0) return { action: "none", reason: "no_unresolved_checkout", status: 200 };
  if (rows.length > 1) return { action: "manual_review", reason: "multiple_unresolved_checkouts", status: 409 };
  let reservation = rows[0];

  // Fallback: a checkout whose create response was lost.
  if (reservationIdentityUnknown(reservation)) {
    if (!unknownReservationSearchDue(reservation, now)) return { action: "keep", reason: "create_may_still_be_settling", status: 200, checkoutUrl: null };
    let matches: Record<string, unknown>[] | null = null;
    try {
      matches = provider.findCheckoutTransactionsForReservation
        ? await provider.findCheckoutTransactionsForReservation({
          reservationId: reservation.id,
          organizationId: reservation.organization_id,
          createdAt: reservation.created_at,
        })
        : null;
    } catch {
      matches = null;
    }
    const unknown = decideUnknownReservation(reservation, matches, now);
    if (unknown.action === "keep") return { action: "keep", reason: unknown.reason, status: 200, checkoutUrl: null };
    if (unknown.action === "manual_review") return { action: "manual_review", reason: unknown.reason, status: 409 };
    if (unknown.action === "release") {
      let released = false;
      try { released = await releaseUnknownReservation(reservation, unknown.evidence); } catch { released = false; }
      return released
        ? { action: "release", reason: unknown.reason, status: 200 }
        : { action: "manual_review", reason: "reservation_state_changed", status: 409 };
    }
    const txn = unknown.transaction;
    const url = (txn.checkout as { url?: unknown } | null | undefined)?.url;
    const transactionId = String(txn.id);
    if (typeof url !== "string" || !HTTPS.test(url)) return { action: "manual_review", reason: "provider_checkout_url_missing", status: 409 };
    let adopted = false;
    try { adopted = await adoptTransaction(reservation, transactionId, url); } catch { adopted = false; }
    if (!adopted) return { action: "manual_review", reason: "reservation_state_changed", status: 409 };
    reservation = { ...reservation, state: "ready", external_transaction_id: transactionId, checkout_url: url };
  }

  let transaction: unknown = null;
  try {
    if (reservation.external_transaction_id && reservation.state !== "uncertain") {
      transaction = await provider.getCheckoutTransaction(reservation.external_transaction_id);
    }
  } catch {
    throw new CheckoutRecoveryUnavailableError("Paddle checkout status could not be read. Try again later.");
  }

  const decision = decidePaddleReservation(reservation, transaction, now);
  if (decision.action === "keep") {
    const url = typeof reservation.checkout_url === "string" && HTTPS.test(reservation.checkout_url) ? reservation.checkout_url : null;
    return { action: "keep", reason: decision.reason, status: 200, checkoutUrl: url, packageKey: reservation.package_key, billingInterval: reservation.billing_interval };
  }
  if (decision.action === "none" || decision.action === "await_provider") return { action: decision.action, reason: decision.reason, status: 200 };
  if (decision.action === "manual_review") return { action: "manual_review", reason: decision.reason, status: 409 };

  try {
    if (decision.action === "cancel_then_release") {
      const status = await provider.cancelCheckoutTransaction(reservation.external_transaction_id as string);
      // Confirm with a fresh read: a payment racing the cancel must win.
      const after = await provider.getCheckoutTransaction(reservation.external_transaction_id as string);
      const afterDecision = decidePaddleReservation(reservation, after, now);
      if (status !== "canceled" || afterDecision.action !== "release") {
        return { action: "manual_review", reason: "cancel_not_confirmed", status: 409 };
      }
    }
    const rpc = decision.action === "settle_paid" ? "rpc/settle_paddle_checkout_reservation" : "rpc/release_paddle_checkout_reservation";
    const ok = await supabaseRest<boolean>(rpc, {
      method: "POST",
      serviceRole: true,
      body: decision.action === "settle_paid"
        ? { p_organization_id: organizationId, p_transaction_id: reservation.external_transaction_id, p_evidence: decision.evidence }
        : { p_reservation_id: reservation.id, p_organization_id: organizationId, p_evidence: decision.evidence },
    });
    if (!ok) return { action: "manual_review", reason: "reservation_state_changed", status: 409 };
  } catch {
    throw new CheckoutRecoveryUnavailableError("Checkout reconciliation could not be completed. Contact support.");
  }
  return { action: decision.action, reason: decision.reason, status: 200 };
}
