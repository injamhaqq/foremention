/**
 * Chat03 (A02/CV-06): Paddle checkout reservation recovery.
 *
 * Problem on main: `billing_checkout_reservations` rows move reserved -> ready
 * (or uncertain) but never leave those states. The partial unique index
 * `billing_checkout_unresolved_org_uidx` (state <> 'reconciled') therefore
 * blocks every later checkout for that organization forever: after a paid
 * subscription is later cancelled, and after an abandoned (never paid)
 * checkout. Nothing reconciles a lost/uncertain create either.
 *
 * This module is the pure decision core. It never grants entitlement: paid
 * access only comes from the signed `transaction.completed` webhook path.
 * Reconciliation can only (a) record that a reservation was already paid,
 * (b) cancel a still-payable abandoned Paddle transaction and then release the
 * reservation, (c) release a reservation whose transaction Paddle reports as
 * canceled, or (d) require operator review. Anything ambiguous is review.
 *
 * Paddle contracts:
 * https://developer.paddle.com/api-reference/transactions/get-transaction
 * https://developer.paddle.com/api-reference/transactions/update-transaction
 *   (draft/ready/billed transactions not created for a subscription can be
 *    canceled with PATCH {status: "canceled"}).
 */

export type CheckoutReservation = {
  id: string;
  organization_id: string;
  package_key: string;
  billing_interval: string;
  state: "reserved" | "ready" | "uncertain" | "reconciled" | string;
  external_transaction_id: string | null;
  created_at: string;
};

export type ReconciliationAction =
  | "none"
  | "keep"
  | "settle_paid"
  | "await_provider"
  | "cancel_then_release"
  | "release"
  | "manual_review";

export type ReconciliationDecision = {
  action: ReconciliationAction;
  reason: string;
  /** Short non-secret evidence string stored with the reservation. */
  evidence: string | null;
};

/** A checkout link left unpaid this long is treated as abandoned. */
export const ABANDONED_CHECKOUT_MINUTES = 60;

const TRANSACTION_ID = /^txn_[a-z0-9]{26}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Json = Record<string, unknown>;
function object(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
}

/**
 * Decide what may be done with one unresolved reservation, given the provider
 * transaction fetched by its exact ID (null when Paddle returned 404).
 */
export function decidePaddleReservation(
  reservation: CheckoutReservation,
  providerTransaction: unknown,
  now = new Date(),
): ReconciliationDecision {
  if (reservation.state === "reconciled") return { action: "none", reason: "already_reconciled", evidence: null };
  if (!UUID.test(reservation.id) || !UUID.test(reservation.organization_id)) {
    return { action: "manual_review", reason: "invalid_reservation_identity", evidence: null };
  }
  if (reservation.state === "uncertain" || !reservation.external_transaction_id) {
    // Paddle cannot list transactions by custom_data, so a create whose
    // response was lost cannot be matched automatically. An operator must
    // search the Paddle dashboard for checkoutReservationId=<id>.
    return { action: "manual_review", reason: "transaction_identity_unknown", evidence: null };
  }
  if (!TRANSACTION_ID.test(reservation.external_transaction_id)) {
    return { action: "manual_review", reason: "invalid_transaction_id", evidence: null };
  }
  const txn = object(providerTransaction);
  if (!txn) return { action: "manual_review", reason: "provider_transaction_missing", evidence: null };
  if (txn.id !== reservation.external_transaction_id) {
    return { action: "manual_review", reason: "provider_transaction_mismatch", evidence: null };
  }
  const custom = object(txn.custom_data);
  const customOrg = typeof custom?.organizationId === "string" ? custom.organizationId.toLowerCase() : null;
  const customReservation = typeof custom?.checkoutReservationId === "string"
    ? custom.checkoutReservationId.toLowerCase() : null;
  if (customOrg !== reservation.organization_id.toLowerCase()
    || customReservation !== reservation.id.toLowerCase()) {
    return { action: "manual_review", reason: "provider_custom_data_mismatch", evidence: null };
  }
  const origin = typeof txn.origin === "string" ? txn.origin : "";
  if (origin.startsWith("subscription_")) {
    return { action: "manual_review", reason: "unexpected_subscription_origin", evidence: null };
  }
  const txnId = reservation.external_transaction_id;
  switch (txn.status) {
    case "completed":
      return { action: "settle_paid", reason: "provider_completed", evidence: "paid:" + txnId };
    case "paid":
    case "billed":
      // Payment captured/finalized but not yet completed: wait for Paddle.
      return { action: "await_provider", reason: "provider_" + txn.status, evidence: null };
    case "canceled":
      return { action: "release", reason: "provider_canceled", evidence: "released:canceled:" + txnId };
    case "draft":
    case "ready": {
      const created = new Date(reservation.created_at);
      if (!Number.isFinite(created.getTime()) || !Number.isFinite(now.getTime())) {
        return { action: "manual_review", reason: "invalid_reservation_time", evidence: null };
      }
      const ageMinutes = (now.getTime() - created.getTime()) / 60_000;
      if (ageMinutes < ABANDONED_CHECKOUT_MINUTES) {
        return { action: "keep", reason: "checkout_still_open", evidence: null };
      }
      return { action: "cancel_then_release", reason: "checkout_abandoned", evidence: "released:abandoned:" + txnId };
    }
    case "past_due":
      return { action: "manual_review", reason: "provider_past_due", evidence: null };
    default:
      return { action: "manual_review", reason: "provider_status_unknown", evidence: null };
  }
}

/**
 * Webhook admission for an initial (api/web origin) paid transaction. A
 * reservation in `ready` is the normal case. After settlement the same event
 * may legitimately be redelivered (Paddle retries up to 60 times over 3 days
 * for live accounts); a reservation settled with the matching paid evidence
 * must keep admitting it so a duplicate is acknowledged instead of retried.
 */
export function reservationAdmitsPaidTransaction(
  row: { organization_id: string; package_key: string; billing_interval: string; state: string; reconciliation_evidence?: string | null },
  expected: { organizationId: string; packageKey: string; billingInterval: string; transactionId: string },
): boolean {
  if (row.organization_id !== expected.organizationId
    || row.package_key !== expected.packageKey
    || row.billing_interval !== expected.billingInterval) return false;
  if (row.state === "ready") return true;
  return row.state === "reconciled" && row.reconciliation_evidence === "paid:" + expected.transactionId;
}

/**
 * Checkout fallback (Oct 15): a reservation whose Paddle create response was
 * lost no longer locks the workspace forever. The buyer never received a
 * checkout link for it, so once this many minutes have passed a search of
 * Paddle's transactions decides it:
 * - exactly one matching transaction -> adopt it and reconcile it normally;
 * - none -> nothing payable exists, release the reservation;
 * - several, or Paddle unreadable -> operator review / try later.
 */
export const UNKNOWN_CHECKOUT_SEARCH_MINUTES = 10;

export type UnknownReservationDecision =
  | { action: "keep"; reason: string }
  | { action: "adopt"; reason: string; transaction: Record<string, unknown> }
  | { action: "release"; reason: string; evidence: string }
  | { action: "manual_review"; reason: string };

export function reservationIdentityUnknown(reservation: CheckoutReservation) {
  return reservation.state === "uncertain" || (reservation.state === "reserved" && !reservation.external_transaction_id);
}

export function unknownReservationSearchDue(reservation: CheckoutReservation, now = new Date()) {
  const created = new Date(reservation.created_at).getTime();
  return Number.isFinite(created) && now.getTime() - created >= UNKNOWN_CHECKOUT_SEARCH_MINUTES * 60_000;
}

export function decideUnknownReservation(
  reservation: CheckoutReservation,
  matches: unknown[] | null,
  now = new Date(),
): UnknownReservationDecision {
  if (!UUID.test(reservation.id) || !UUID.test(reservation.organization_id)) {
    return { action: "manual_review", reason: "invalid_reservation_identity" };
  }
  if (!reservationIdentityUnknown(reservation)) return { action: "manual_review", reason: "identity_already_known" };
  if (!unknownReservationSearchDue(reservation, now)) return { action: "keep", reason: "create_may_still_be_settling" };
  if (matches === null) return { action: "manual_review", reason: "provider_search_unavailable" };
  if (matches.length === 0) {
    return { action: "release", reason: "no_provider_transaction", evidence: "released:not_created:" + reservation.id.toLowerCase() };
  }
  if (matches.length > 1) return { action: "manual_review", reason: "multiple_provider_transactions" };
  const txn = object(matches[0]);
  const custom = object(txn?.custom_data);
  if (!txn || !TRANSACTION_ID.test(String(txn.id || ""))
    || String(custom?.checkoutReservationId || "").toLowerCase() !== reservation.id.toLowerCase()
    || String(custom?.organizationId || "").toLowerCase() !== reservation.organization_id.toLowerCase()) {
    return { action: "manual_review", reason: "provider_transaction_mismatch" };
  }
  return { action: "adopt", reason: "provider_transaction_found", transaction: txn };
}
