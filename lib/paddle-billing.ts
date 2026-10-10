/**
 * FM-09: NON-WIRED Paddle candidate. This module is NOT an active billing provider.
 * The FM-00-owned billing-provider selector intentionally remains unchanged.
 * Sandbox/live enablement is fail-closed; merchant approval and payout validation
 * are external gates. No HTTP route imports this module.
 *
 * Official contracts:
 * https://developer.paddle.com/api-reference/transactions/create-transaction
 * https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session
 * https://developer.paddle.com/webhooks/about/signature-verification
 */
import type { VerifiedBillingEvent, BillingLifecycleState } from "./billing.ts";
import { paddleSandboxRuntimeAllowed } from "./paddle-sandbox-staging.ts";

const API_URLS = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
} as const;

export type PaddlePackage = "core" | "signal";
export type PaddleInterval = "monthly" | "annual";
export type PaddleParsedEvent = Omit<VerifiedBillingEvent, "organizationId"> & {
  organizationId: string | null;
};
type Json = Record<string, unknown>;
const PRICE_ID = /^pri_[a-z0-9]{26}$/;
const CUSTOMER_ID = /^ctm_[a-z0-9]{26}$/;
const SUBSCRIPTION_ID = /^sub_[a-z0-9]{26}$/;
const TRANSACTION_ID = /^txn_[a-z0-9]{26}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_ENV = {
  core: { monthly: "PADDLE_CORE_MONTHLY_PRICE_ID", annual: "PADDLE_CORE_ANNUAL_PRICE_ID" },
  signal: { monthly: "PADDLE_SIGNAL_MONTHLY_PRICE_ID", annual: "PADDLE_SIGNAL_ANNUAL_PRICE_ID" },
} as const;

function env(name: string) { return process.env[name]?.trim() || null; }
function object(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
}
function idFrom(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function isHttpsLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function paddlePriceIdFor(pkg: PaddlePackage, interval: PaddleInterval) {
  const name = PRICE_ENV[pkg]?.[interval];
  const value = name ? env(name) : null;
  return value && PRICE_ID.test(value) ? value : null;
}

function configuredPrices() {
  const rows: { packageKey: PaddlePackage; billingInterval: PaddleInterval; priceId: string }[] = [];
  for (const packageKey of ["core", "signal"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      const priceId = paddlePriceIdFor(packageKey, billingInterval);
      if (priceId) rows.push({ packageKey, billingInterval, priceId });
    }
  }
  return rows;
}
export function paddlePackageForPriceId(priceId: string | null) {
  if (!priceId) return null;
  const matches = configuredPrices().filter((row) => row.priceId === priceId);
  return matches.length === 1 ? matches[0] : null;
}

export function paddleCandidateConfigured() {
  // Deliberately cannot activate while the existing provider selector only
  // recognizes Stripe and Creem. These checks also guard future integration.
  if (env("BILLING_PROVIDER_ID") !== "paddle") return false;
  const mode = env("PADDLE_ENVIRONMENT");
  if (mode !== "sandbox" && mode !== "live") return false;
  // Production builds refuse sandbox unless the explicit isolated staging gate
  // (lib/paddle-sandbox-staging.ts) is satisfied. It never enables Live.
  if (process.env.NODE_ENV === "production" && mode !== "live" && !paddleSandboxRuntimeAllowed()) return false;
  if (mode === "live" && env("PADDLE_LIVE_ENABLED") !== "1") return false;
  if (!env("PADDLE_API_KEY") || !env("PADDLE_WEBHOOK_SECRET")) return false;
  const rows = configuredPrices();
  if (!rows.length) return false;
  // Reject ambiguous mapping across packages AND intervals.
  if (rows.length !== new Set(rows.map((row) => row.priceId)).size) return false;
  return true;
}

async function paddlePost(path: string, data: Json) {
  if (!paddleCandidateConfigured()) throw new Error("Paddle candidate is not configured.");
  const mode = env("PADDLE_ENVIRONMENT");
  if (mode !== "sandbox" && mode !== "live") throw new Error("Invalid Paddle environment.");
  const response = await fetch(API_URLS[mode] + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + env("PADDLE_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Paddle request failed (HTTP " + response.status + ").");
  const payload = await response.json().catch(() => null);
  const result = object(payload);
  return object(result?.data);
}

export async function createPaddleCandidateCheckout(input: {
  packageKey: PaddlePackage;
  billingInterval: PaddleInterval;
  organizationId: string;
  customerId?: string | null;
  checkoutReservationId?: string | null;
}) {
  if (!UUID.test(input.organizationId)) throw new Error("Invalid billing organization.");
  if (input.checkoutReservationId && !UUID.test(input.checkoutReservationId)) {
    throw new Error("Invalid Paddle checkout reservation.");
  }
  const priceId = paddlePriceIdFor(input.packageKey, input.billingInterval);
  if (!priceId) throw new Error("Paddle offer is not configured.");
  const customerId = input.customerId || null;
  if (customerId && !CUSTOMER_ID.test(customerId)) throw new Error("Invalid Paddle customer identity.");
  // IMPORTANT: a future integration must acquire an atomic pending-checkout
  // reservation before this external call. No route invokes this candidate.
  const payload: Json = {
    collection_mode: "automatic",
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: {
      organizationId: input.organizationId.toLowerCase(),
      packageKey: input.packageKey,
      billingInterval: input.billingInterval,
      ...(input.checkoutReservationId ? { checkoutReservationId: input.checkoutReservationId.toLowerCase() } : {}),
    },
  };
  if (customerId) payload.customer_id = customerId;
  const data = await paddlePost("/transactions", payload);
  const checkout = object(data?.checkout);
  if (!TRANSACTION_ID.test(String(data?.id || "")) || !isHttpsLink(checkout?.url)) {
    throw new Error("Paddle did not return an eligible hosted checkout transaction.");
  }
  return { id: data!.id as string, url: checkout!.url as string };
}

export async function createPaddleCandidatePortal(customerId: string) {
  if (!CUSTOMER_ID.test(customerId)) throw new Error("Verified Paddle customer identity required.");
  const data = await paddlePost("/customers/" + encodeURIComponent(customerId) + "/portal-sessions", {});
  const url = object(object(data?.urls)?.general)?.overview;
  if (!isHttpsLink(url)) throw new Error("Paddle did not return a secure customer portal URL.");
  // Links contain temporary access tokens. Never persist them.
  return { url };
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
function fixedEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
export async function verifyPaddleCandidateWebhook(
  rawBody: string,
  signatureHeader: string | null,
  now = new Date(),
) {
  const secret = env("PADDLE_WEBHOOK_SECRET");
  if (!secret) throw new Error("Paddle webhook is not configured.");
  if (!signatureHeader || signatureHeader.length > 600) throw new Error("Paddle signature is invalid.");
  const parts = signatureHeader.split(";").map((s) => s.trim());
  const timestamps = parts.filter((s) => s.startsWith("ts=")).map((s) => s.slice(3));
  const signatures = parts.filter((s) => s.startsWith("h1=")).map((s) => s.slice(3).toLowerCase());
  if (timestamps.length !== 1 || !/^[0-9]{10,11}$/.test(timestamps[0]) ||
    !signatures.length || signatures.length > 3 || !signatures.every((s) => /^[a-f0-9]{64}$/.test(s))) {
    throw new Error("Paddle signature is invalid.");
  }
  const eventMs = Number(timestamps[0]) * 1000;
  // Official SDK defaults to five seconds. Reject future, expired and invalid.
  if (!Number.isFinite(now.getTime()) || Math.abs(now.getTime() - eventMs) > 5000) {
    throw new Error("Paddle signature timestamp is invalid.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const calculated = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamps[0] + ":" + rawBody))));
  if (!signatures.some((signature) => fixedEqual(signature, calculated))) throw new Error("Paddle signature is invalid.");
  return true;
}
function occurredAt(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function scopedOrganization(data: Json) {
  const custom = object(data.custom_data);
  const candidate = typeof custom?.organizationId === "string" ? custom.organizationId.trim().toLowerCase() : null;
  return candidate && UUID.test(candidate) ? candidate : null;
}
function singleConfiguredPackage(data: Json) {
  if (!Array.isArray(data.items) || data.items.length !== 1) return null;
  const item = object(data.items[0]);
  if (!item || item.quantity !== 1) return null;
  const price = object(item.price);
  const priceId = idFrom(price?.id) || idFrom(item.price_id);
  return paddlePackageForPriceId(priceId);
}

/**
 * A non-entitlement financial adjustment classification. This candidate does
 * not persist or acknowledge adjustment webhooks. FM-00 must create an atomic,
 * durable case receipt keyed by provider+eventId before returning HTTP 2xx.
 * Never directly revoke or grant an entitlement based on this classification.
 *
 * https://developer.paddle.com/webhooks/adjustments/adjustment-created/
 * https://developer.paddle.com/webhooks/adjustments/adjustment-updated/
 */
export type PaddleCandidateAdjustment = {
  eventId: string;
  occurredAt: string;
  adjustmentId: string;
  eventType: "adjustment.created" | "adjustment.updated";
  action:
    | "credit"
    | "refund"
    | "chargeback"
    | "chargeback_reverse"
    | "chargeback_warning"
    | "chargeback_warning_reverse"
    | "credit_reverse";
  status: "pending_approval" | "approved" | "rejected" | "reversed";
  adjustmentType: "full" | "partial" | null;
  transactionId: string;
  subscriptionId: string | null;
  customerId: string;
  // Always true: a refund, credit or dispute requires audit and reconciliation.
  requiresReview: true;
};

const ADJUSTMENT_ACTIONS = new Set<PaddleCandidateAdjustment["action"]>([
  "credit", "refund", "chargeback", "chargeback_reverse",
  "chargeback_warning", "chargeback_warning_reverse", "credit_reverse",
]);
const ADJUSTMENT_STATES = new Set<PaddleCandidateAdjustment["status"]>([
  "pending_approval", "approved", "rejected", "reversed",
]);
const ADJUSTMENT_ID = /^adj_[a-z0-9]{26}$/;

/** Return null only for unrelated event types; malformed adjustments throw. */
export function parsePaddleCandidateAdjustment(rawBody: string): PaddleCandidateAdjustment | null {
  let event: Json | null;
  try { event = object(JSON.parse(rawBody)); } catch { throw new Error("Invalid Paddle adjustment JSON."); }
  if (!event) throw new Error("Invalid Paddle adjustment envelope.");
  if (event.event_type !== "adjustment.created" && event.event_type !== "adjustment.updated") return null;
  const eventId = idFrom(event.event_id);
  const occurred = occurredAt(event.occurred_at);
  const data = object(event.data);
  if (!eventId || !/^evt_[a-z0-9]{26}$/.test(eventId) || !occurred || !data) {
    throw new Error("Invalid Paddle adjustment envelope.");
  }
  const adjustmentId = idFrom(data.id);
  const action = idFrom(data.action) as PaddleCandidateAdjustment["action"] | null;
  const status = idFrom(data.status) as PaddleCandidateAdjustment["status"] | null;
  const adjustmentType = data.type === null ? null : idFrom(data.type);
  const transactionId = idFrom(data.transaction_id);
  const subscriptionId = idFrom(data.subscription_id);
  const customerId = idFrom(data.customer_id);
  if (!Object.hasOwn(data, "type") || !adjustmentId || !ADJUSTMENT_ID.test(adjustmentId)
    || !action || !ADJUSTMENT_ACTIONS.has(action)
    || !status || !ADJUSTMENT_STATES.has(status)
    || (adjustmentType !== "full" && adjustmentType !== "partial" && adjustmentType !== null)
    || !transactionId || !TRANSACTION_ID.test(transactionId)
    || !customerId || !CUSTOMER_ID.test(customerId)
    || (subscriptionId !== null && !SUBSCRIPTION_ID.test(subscriptionId))) {
    throw new Error("Paddle adjustment requires valid financial and identity fields.");
  }
  return {
    eventId,
    occurredAt: occurred,
    adjustmentId,
    eventType: event.event_type,
    action,
    status,
    adjustmentType,
    transactionId,
    subscriptionId,
    customerId,
    requiresReview: true,
  };
}

/**
 * Entitlement changes deliberately exclude subscription.created / activated,
 * trialing / updated / resumed and transaction.billed / paid: Paddle may create
 * or activate a manually billed subscription before its invoice is paid.
 * Only transaction.completed grants an active paid entitlement.
 *
 * This is a candidate event parser ONLY. Future FM-00 integration must
 * persist adjustment/refund/chargeback cases separately before acknowledging.
 */
export function parsePaddleCandidateEvent(rawBody: string): PaddleParsedEvent | null {
  let event: Json | null;
  try { event = object(JSON.parse(rawBody)); } catch { throw new Error("Invalid Paddle webhook JSON."); }
  if (!event) throw new Error("Invalid Paddle webhook event.");
  const eventId = idFrom(event.event_id);
  const eventType = idFrom(event.event_type);
  const effectiveAt = occurredAt(event.occurred_at);
  const data = object(event.data);
  if (!eventId || !/^evt_[a-z0-9]{26}$/.test(eventId) || !eventType || !effectiveAt || !data) {
    throw new Error("Invalid Paddle webhook envelope.");
  }
  const offer = singleConfiguredPackage(data);
  if (!offer) return null;
  const externalCustomerId = idFrom(data.customer_id);
  if (!externalCustomerId || !CUSTOMER_ID.test(externalCustomerId)) return null;

  let state: BillingLifecycleState;
  let subscriptionId: string | null;
  if (eventType === "transaction.completed") {
    if (data.status !== "completed") return null;
    // Paddle generates zero-value transactions for payment-method updates.
    // Only a completed monetary charge is suitable for paid entitlement.
    // Credit-funded or 100%-discounted cases require separate owner policy.
    const totals = object(object(data.details)?.totals);
    const grandTotal = totals?.grand_total;
    const origin = idFrom(data.origin);
    if (!TRANSACTION_ID.test(idFrom(data.id) || "")
      || !["api", "web", "subscription_recurring", "subscription_update"].includes(origin || "")
      || (data.collection_mode !== "automatic" && data.collection_mode !== "manual")
      || typeof grandTotal !== "string"
      || !/^[1-9][0-9]*$/.test(grandTotal)) return null;
    subscriptionId = idFrom(data.subscription_id);
    if (!subscriptionId || !SUBSCRIPTION_ID.test(subscriptionId)) return null;
    state = "active";
  } else if (["subscription.past_due", "subscription.paused", "subscription.canceled"].includes(eventType)) {
    const expected: Record<string, BillingLifecycleState> = {
      "subscription.past_due": "past_due",
      "subscription.paused": "paused",
      "subscription.canceled": "cancelled",
    };
    state = expected[eventType];
    if (data.status !== (state === "cancelled" ? "canceled" : state)) return null;
    subscriptionId = idFrom(data.id);
    if (!subscriptionId || !SUBSCRIPTION_ID.test(subscriptionId)) return null;
  } else {
    // adjustment.created / adjustment.updated MUST later enter a separate
    // durable reconciliation stream; this non-wired adapter cannot grant access.
    return null;
  }
  return {
    organizationId: scopedOrganization(data),
    packageKey: offer.packageKey,
    state,
    externalCustomerId,
    externalSubscriptionId: subscriptionId,
    eventId,
    occurredAt: effectiveAt,
  };
}
