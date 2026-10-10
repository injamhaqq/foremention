import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  paddleCandidateConfigured, paddlePackageForPriceId, paddlePriceIdFor,
  verifyPaddleCandidateWebhook, parsePaddleCandidateEvent, parsePaddleCandidateAdjustment,
  createPaddleCandidateCheckout, createPaddleCandidatePortal,
} from "../lib/paddle-billing.ts";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const price = { core: "pri_" + "a".repeat(26), signal: "pri_" + "b".repeat(26) };
const identifiers = {
  customer: "ctm_" + "c".repeat(26),
  subscription: "sub_" + "d".repeat(26),
  transaction: "txn_" + "e".repeat(26),
  event: "evt_" + "f".repeat(26),
};
const org = "11111111-1111-4111-8111-111111111111";
const occurred_at = "2026-10-09T12:00:00.000Z";

function envSetup() {
  process.env.BILLING_PROVIDER_ID = "paddle";
  process.env.PADDLE_ENVIRONMENT = "sandbox";
  process.env.NODE_ENV = "test";
  process.env.PADDLE_API_KEY = "sandbox_mock_only";
  process.env.PADDLE_WEBHOOK_SECRET = "sandbox_signature_mock";
  process.env.PADDLE_CORE_MONTHLY_PRICE_ID = price.core;
  process.env.PADDLE_SIGNAL_MONTHLY_PRICE_ID = price.signal;
}
function event(event_type, data, patch = {}) {
  return JSON.stringify({
    event_id: identifiers.event, event_type, occurred_at,
    data: {
      id: identifiers.transaction,
      status: "completed",
      collection_mode: "automatic",
      origin: "api",
      details: { totals: { grand_total: "49900" } },
      customer_id: identifiers.customer,
      subscription_id: identifiers.subscription,
      custom_data: { organizationId: org, packageKey: "signal" },
      items: [{ price: { id: price.core }, quantity: 1 }],
      ...data,
    },
    ...patch,
  });
}
test.afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  globalThis.fetch = originalFetch;
});

test("standalone Paddle candidate is not wired into current production billing routes", async () => {
  const [adapter, route, module] = await Promise.all([
    readFile(new URL("../lib/stripe-billing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/paddle-billing.ts", import.meta.url), "utf8"),
  ]);
  assert.match(adapter, /stripe/i);
  assert.doesNotMatch(route, /paddle-billing/);
  assert.match(module, /NON-WIRED Paddle candidate/);
});

test("Paddle sandbox fails closed without credentials, and production sandbox fails closed", () => {
  delete process.env.BILLING_PROVIDER_ID;
  assert.equal(paddleCandidateConfigured(), false);
  envSetup();
  assert.equal(paddleCandidateConfigured(), true);
  process.env.NODE_ENV = "production";
  assert.equal(paddleCandidateConfigured(), false);
  process.env.PADDLE_ENVIRONMENT = "live";
  assert.equal(paddleCandidateConfigured(), false);
  process.env.PADDLE_LIVE_ENABLED = "1";
  assert.equal(paddleCandidateConfigured(), true);
  process.env.PADDLE_ENVIRONMENT = "invalid";
  assert.equal(paddleCandidateConfigured(), false);
});

test("Paddle price IDs uniquely map to one package and billing interval", () => {
  envSetup();
  assert.equal(paddlePriceIdFor("core", "monthly"), price.core);
  assert.deepEqual(paddlePackageForPriceId(price.core), {
    priceId: price.core, packageKey: "core", billingInterval: "monthly",
  });
  process.env.PADDLE_SIGNAL_MONTHLY_PRICE_ID = price.core;
  assert.equal(paddleCandidateConfigured(), false);
  assert.equal(paddlePackageForPriceId(price.core), null);
});

test("Paddle signature requires fresh timestamp and HMAC over timestamp:raw body", async () => {
  envSetup();
  const now = new Date(occurred_at);
  const raw = event("transaction.completed");
  const ts = String(Math.floor(now.getTime() / 1000));
  const h1 = crypto.createHmac("sha256", process.env.PADDLE_WEBHOOK_SECRET).update(ts + ":" + raw).digest("hex");
  assert.equal(await verifyPaddleCandidateWebhook(raw, "ts=" + ts + ";h1=" + h1, now), true);
  assert.equal(await verifyPaddleCandidateWebhook(raw, "ts=" + ts + ";h1=" + "0".repeat(64) + ";h1=" + h1, now), true);
  await assert.rejects(() => verifyPaddleCandidateWebhook(raw + " ", "ts=" + ts + ";h1=" + h1, now), /signature/i);
  await assert.rejects(() => verifyPaddleCandidateWebhook(raw, "ts=" + ts + ";h1=" + h1, new Date(now.getTime() + 6000)), /timestamp/i);
  await assert.rejects(() => verifyPaddleCandidateWebhook(raw, "ts=" + ts + ";h1=" + h1, new Date(now.getTime() - 6000)), /timestamp/i);
  await assert.rejects(() => verifyPaddleCandidateWebhook(raw, "ts=x;h1=" + h1, now), /signature/i);
});

test("payment-completed transaction grants only server-mapped package, not forged metadata", () => {
  envSetup();
  const paid = parsePaddleCandidateEvent(event("transaction.completed"));
  assert.deepEqual(paid, {
    organizationId: org, packageKey: "core", state: "active",
    externalCustomerId: identifiers.customer,
    externalSubscriptionId: identifiers.subscription,
    externalTransactionId: identifiers.transaction,
    transactionOrigin: "api",
    billingInterval: "monthly",
    eventId: identifiers.event, occurredAt: occurred_at,
  });
  // When correlation context is absent, a future webhook route must look up
  // already-stored subscription identity before any write.
  const noMeta = parsePaddleCandidateEvent(event("transaction.completed", { custom_data: null }));
  assert.equal(noMeta?.organizationId, null);
});

test("issued/unpaid manual invoices and subscription activation cannot grant paid entitlement", () => {
  envSetup();
  for (const kind of [
    "transaction.created", "transaction.billed", "transaction.paid",
    "subscription.created", "subscription.activated", "subscription.trialing",
    "subscription.resumed", "subscription.updated",
  ]) {
    assert.equal(parsePaddleCandidateEvent(event(kind, { status: "active" })), null, kind);
  }
  // Unlike 'billed', 'completed' is a paid and processed transaction.
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", { collection_mode: "manual" }))?.state, "active");
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", { status: "billed" })), null);
});

test("Paddle paid events carry exact transaction, origin and interval for durable admission checks", () => {
  envSetup();
  for (const origin of ["api", "web", "subscription_recurring", "subscription_update"]) {
    const parsed = parsePaddleCandidateEvent(event("transaction.completed", { origin }));
    assert.equal(parsed?.externalTransactionId, identifiers.transaction);
    assert.equal(parsed?.transactionOrigin, origin);
    assert.equal(parsed?.billingInterval, "monthly");
    assert.equal(parsed?.organizationId, org);
  }
  const cancelled = parsePaddleCandidateEvent(event("subscription.canceled", {
    id: identifiers.subscription, status: "canceled",
  }));
  assert.equal(cancelled?.externalTransactionId, undefined);
  assert.equal(cancelled?.transactionOrigin, undefined);
});

test("zero-value and payment-method-update transactions cannot grant paid access", () => {
  envSetup();
  for (const data of [
    { origin: "subscription_payment_method_change" },
    { origin: "subscription_charge" },
    { origin: "unknown_origin" },
    { origin: null },
    { details: { totals: { grand_total: "0" } } },
    { details: { totals: { grand_total: "-1" } } },
    { details: { totals: { grand_total: "0.00" } } },
    { details: { totals: { grand_total: "not money" } } },
    { details: { totals: {} } },
    { details: null },
    { id: "txn_invalid" },
  ]) {
    assert.equal(parsePaddleCandidateEvent(event("transaction.completed", data)), null, JSON.stringify(data));
  }
  for (const origin of ["api", "web", "subscription_recurring", "subscription_update"]) {
    assert.equal(parsePaddleCandidateEvent(event("transaction.completed", { origin }))?.state, "active");
  }
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", {
    collection_mode: "manual",
    details: { totals: { grand_total: "49900" } },
  }))?.state, "active");
});

test("unknown, multiple, or quantity-increased price lines never grant entitlements", () => {
  envSetup();
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", {
    items: [{ quantity: 1, price: { id: "pri_" + "z".repeat(26) } }],
  })), null);
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", {
    items: [{ quantity: 1, price: { id: price.core } }, { quantity: 1, price: { id: price.signal } }],
  })), null);
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", {
    items: [{ quantity: 3, price: { id: price.core } }],
  })), null);
  assert.equal(parsePaddleCandidateEvent(event("transaction.completed", {
    subscription_id: null,
  })), null);
});

test("past-due, pause and terminal cancellation events update billing state only with exact status", () => {
  envSetup();
  for (const [kind, status, expected] of [
    ["subscription.past_due", "past_due", "past_due"],
    ["subscription.paused", "paused", "paused"],
    ["subscription.canceled", "canceled", "cancelled"],
  ]) {
    const parsed = parsePaddleCandidateEvent(event(kind, {
      id: identifiers.subscription, status,
    }));
    assert.equal(parsed?.state, expected);
    assert.equal(parsed?.externalSubscriptionId, identifiers.subscription);
    assert.equal(parsePaddleCandidateEvent(event(kind, {
      id: identifiers.subscription, status: "active",
    })), null);
  }
});

test("adjustment, chargeback and refund events do not masquerade as payment completion", () => {
  envSetup();
  for (const kind of ["adjustment.created", "adjustment.updated"]) {
    assert.equal(parsePaddleCandidateEvent(event(kind, { action: "chargeback" })), null);
    assert.equal(parsePaddleCandidateEvent(event(kind, { action: "refund" })), null);
  }
});

test("Paddle sandbox creates an automatic transaction with pinned price and server correlation only", async () => {
  envSetup();
  let captured = null;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({
      data: { id: identifiers.transaction, checkout: { url: "https://foremention.com/pay?_ptxn=" + identifiers.transaction } },
    }), { status: 201, headers: { "content-type": "application/json" } });
  };
  const result = await createPaddleCandidateCheckout({
    packageKey: "core", billingInterval: "monthly", organizationId: org,
  });
  assert.equal(result.id, identifiers.transaction);
  assert.equal(captured.url, "https://sandbox-api.paddle.com/transactions");
  assert.equal(captured.options.headers.Authorization, "Bearer sandbox_mock_only");
  const body = JSON.parse(captured.options.body);
  assert.equal(body.collection_mode, "automatic");
  assert.deepEqual(body.items, [{ price_id: price.core, quantity: 1 }]);
  assert.deepEqual(body.custom_data, { organizationId: org, packageKey: "core", billingInterval: "monthly" });
  assert.equal(body.status, undefined);
  assert.equal(body.billing_details, undefined);
});

test("candidate checkout refuses invalid identity and invalid/unapproved links", async () => {
  envSetup();
  await assert.rejects(() => createPaddleCandidateCheckout({
    packageKey: "core", billingInterval: "monthly", organizationId: "wrong",
  }), /organization/i);
  await assert.rejects(() => createPaddleCandidateCheckout({
    packageKey: "core", billingInterval: "monthly", organizationId: org, customerId: "cus_stripe",
  }), /customer/i);
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: { id: identifiers.transaction, checkout: { url: "javascript:alert(1)" } },
  }), { status: 201 });
  await assert.rejects(() => createPaddleCandidateCheckout({
    packageKey: "core", billingInterval: "monthly", organizationId: org,
  }), /hosted checkout/i);
});

test("customer portal requests use Paddle customer IDs and never cache links", async () => {
  envSetup();
  let captured = null;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({
      data: { urls: { general: { overview: "https://customer-portal.paddle.com/example?token=test" } } },
    }), { status: 201 });
  };
  assert.equal((await createPaddleCandidatePortal(identifiers.customer)).url,
    "https://customer-portal.paddle.com/example?token=test");
  assert.equal(captured.url, "https://sandbox-api.paddle.com/customers/" + identifiers.customer + "/portal-sessions");
  assert.equal(captured.options.cache, "no-store");
  await assert.rejects(() => createPaddleCandidatePortal("cust_creem"), /customer/i);
});

test("financial adjustments classify refund, credit, chargeback and reversals without entitlement grants", () => {
  envSetup();
  const financialCases = [
    ["refund", "pending_approval"],
    ["refund", "approved"],
    ["refund", "rejected"],
    ["credit", "approved"],
    ["chargeback", "approved"],
    ["chargeback_warning", "approved"],
    ["chargeback_reverse", "approved"],
    ["chargeback_warning_reverse", "reversed"],
    ["credit_reverse", "reversed"],
  ];
  for (const [action, status] of financialCases) {
    const payload = event("adjustment.created", {
      id: "adj_" + "g".repeat(26),
      action, status, type: "partial",
      transaction_id: identifiers.transaction,
      subscription_id: identifiers.subscription,
      customer_id: identifiers.customer,
    });
    assert.equal(parsePaddleCandidateEvent(payload), null);
    assert.deepEqual(parsePaddleCandidateAdjustment(payload), {
      eventId: identifiers.event,
      occurredAt: occurred_at,
      adjustmentId: "adj_" + "g".repeat(26),
      eventType: "adjustment.created",
      action, status, adjustmentType: "partial",
      transactionId: identifiers.transaction,
      subscriptionId: identifiers.subscription,
      customerId: identifiers.customer,
      requiresReview: true,
    });
    const updated = payload.replace("adjustment.created", "adjustment.updated");
    assert.equal(parsePaddleCandidateAdjustment(updated)?.eventType, "adjustment.updated");
  }
});

test("malformed financial events are errors, not silently acknowledged as ignorable", () => {
  envSetup();
  const valid = {
    id: "adj_" + "g".repeat(26), action: "refund",
    status: "pending_approval", type: "full",
    transaction_id: identifiers.transaction,
    subscription_id: null, customer_id: identifiers.customer,
  };
  assert.equal(parsePaddleCandidateAdjustment(event("transaction.completed")), null);
  assert.equal(parsePaddleCandidateAdjustment(event("adjustment.created", valid))?.subscriptionId, null);
  for (const patch of [
    { transaction_id: "txn_bad" },
    { customer_id: "cust_unrelated" },
    { id: "adj_bad" },
    { status: "unknown" },
    { action: "unknown" },
    { type: "unknown" },
    { subscription_id: "sub_bad" },
  ]) {
    assert.throws(
      () => parsePaddleCandidateAdjustment(event("adjustment.updated", { ...valid, ...patch })),
      /adjustment/i,
    );
  }
  assert.throws(() => parsePaddleCandidateAdjustment("{invalid"), /adjustment/i);
  assert.throws(
    () => parsePaddleCandidateAdjustment(event("adjustment.created", valid, { event_id: "" })),
    /adjustment/i,
  );
});
test("nullable adjustment type is documented by Paddle and must not be mistaken for missing", () => {
  envSetup();
  const fields = {
    id: "adj_" + "g".repeat(26),
    action: "chargeback",
    status: "approved",
    type: null,
    transaction_id: identifiers.transaction,
    subscription_id: null,
    customer_id: identifiers.customer,
  };
  const parsed = parsePaddleCandidateAdjustment(event("adjustment.created", fields));
  assert.equal(parsed?.adjustmentType, null);
  const missing = { ...fields };
  delete missing.type;
  assert.throws(() => parsePaddleCandidateAdjustment(event("adjustment.created", missing)), /adjustment/i);
});
