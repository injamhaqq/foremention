// Chat03 runtime fixtures: the real Paddle billing webhook route is executed
// against signed mock events and an in-memory PostgREST double. No network,
// no Paddle API, no database. Covers reservation settlement, redelivery after
// settlement, unmappable paid transactions, unrelated payments and
// subscription lifecycle events for archived (no longer configured) prices.
import "./attach-v1-03-support/register.mjs";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

const SECRET = "mock-webhook-signing-secret";
const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "99999999-9999-4999-8999-999999999999";
const RES = "22222222-2222-4222-8222-222222222222";
const CORE = "pri_" + "c".repeat(26);
const SIGNAL = "pri_" + "s".repeat(26);
const ARCHIVED = "pri_" + "z".repeat(26);
const FOREIGN = "pri_" + "f".repeat(26);
const CTM = "ctm_" + "a".repeat(26);
const SUB = "sub_" + "b".repeat(26);
const TXN = "txn_" + "t".repeat(26);

Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://db.attach03.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-mock",
  SUPABASE_SERVICE_ROLE_KEY: "service-mock",
  BILLING_PROVIDER_ID: "paddle",
  PADDLE_ENVIRONMENT: "sandbox",
  PADDLE_SANDBOX_ADAPTER_ENABLED: "1",
  PADDLE_API_KEY: "pdl_sdbx_mock_key",
  PADDLE_WEBHOOK_SECRET: SECRET,
  PADDLE_CORE_MONTHLY_PRICE_ID: CORE,
  PADDLE_SIGNAL_MONTHLY_PRICE_ID: SIGNAL,
});
delete process.env.PADDLE_LIVE_ENABLED;

const { POST } = await import("../app/api/billing/webhook/route.ts");

/** Minimal PostgREST double: records every call; handlers decide responses. */
function database(handlers) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://db.attach03.invalid", "no network outside the database double");
    const path = url.pathname.replace("/rest/v1/", "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path, query: url.search, method: init.method || "GET", body });
    const handler = handlers[path];
    const result = handler ? handler({ query: url.search, body }) : [];
    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function signed(payload) {
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const h1 = createHmac("sha256", SECRET).update(ts + ":" + raw).digest("hex");
  return new Request("https://foremention.test/api/billing/webhook", {
    method: "POST",
    headers: { "paddle-signature": `ts=${ts};h1=${h1}`, "content-type": "application/json" },
    body: raw,
  });
}

let seq = 0;
function eventId() { seq += 1; return "evt_" + String(seq).padStart(26, "0"); }

function completed({ items = [{ quantity: 1, price: { id: CORE } }], custom = { organizationId: ORG, checkoutReservationId: RES, packageKey: "core", billingInterval: "monthly" }, origin = "api", total = "9900" } = {}) {
  const now = Date.now();
  return {
    event_id: eventId(),
    event_type: "transaction.completed",
    occurred_at: new Date(now - 1000).toISOString(),
    data: {
      id: TXN, status: "completed", origin, collection_mode: "automatic",
      customer_id: CTM, subscription_id: SUB, custom_data: custom, items,
      details: { totals: { grand_total: total } },
      billing_period: { starts_at: new Date(now - 2000).toISOString(), ends_at: new Date(now + 30 * 864e5).toISOString() },
    },
  };
}

function lifecycle(type, status, price = ARCHIVED, customer = CTM) {
  return {
    event_id: eventId(),
    event_type: type,
    occurred_at: new Date(Date.now() - 1000).toISOString(),
    data: { id: SUB, status, customer_id: customer, custom_data: null, items: [{ quantity: 1, price: { id: price } }] },
  };
}

const rpcNames = (calls) => calls.filter((c) => c.path.startsWith("rpc/")).map((c) => c.path);

test("initial paid checkout with a ready reservation is applied once and its reservation is settled", async () => {
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{ organization_id: ORG, package_key: "core", billing_interval: "monthly", state: "ready", reconciliation_evidence: null }],
    "billing_webhook_events": () => [{ provider: "paddle", event_id: "x", processed_at: null }],
    "rpc/apply_billing_event_atomic_v2": () => true,
    "rpc/settle_paddle_checkout_reservation": () => true,
  });
  try {
    const response = await POST(signed(completed()));
    assert.equal(response.status, 200);
    assert.deepEqual(rpcNames(db.calls), ["rpc/apply_billing_event_atomic_v2", "rpc/settle_paddle_checkout_reservation"]);
    const apply = db.calls.find((c) => c.path === "rpc/apply_billing_event_atomic_v2").body;
    assert.equal(apply.p_organization_id, ORG);
    assert.equal(apply.p_package_key, "core");
    assert.equal(apply.p_state, "active");
    assert.ok(apply.p_entitlement_expires_at, "paid entitlement is bounded by the billed period");
    const settle = db.calls.find((c) => c.path === "rpc/settle_paddle_checkout_reservation").body;
    assert.deepEqual(settle, { p_organization_id: ORG, p_transaction_id: TXN, p_evidence: "paid:" + TXN });
  } finally { db.restore(); }
});

test("redelivery after a processed billing receipt is a safe duplicate, not a second grant", async () => {
  const payload = completed();
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{
      organization_id: ORG, package_key: "core", billing_interval: "monthly",
      state: "reconciled", reconciliation_evidence: "paid:" + TXN,
    }],
    "billing_webhook_events": ({ query }) => query.includes("on_conflict")
      ? [] // uniqueness conflict, nothing newly inserted
      : [{ provider: "paddle", event_id: payload.event_id, organization_id: ORG, processed_at: new Date().toISOString() }],
  });
  try {
    const response = await POST(signed(payload));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).duplicate, true);
    assert.ok(!rpcNames(db.calls).includes("rpc/apply_billing_event_atomic_v2"));
    assert.ok(db.calls.some((call) => call.path === "billing_webhook_events" && call.query.includes("select=")));
  } finally { db.restore(); }
});

test("pending billing receipt must return retryable 503 and never double-grant", async () => {
  const payload = completed();
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{
      organization_id: ORG, package_key: "core", billing_interval: "monthly",
      state: "ready", reconciliation_evidence: null,
    }],
    "billing_webhook_events": ({ query }) => query.includes("on_conflict")
      ? []
      : [{ provider: "paddle", event_id: payload.event_id, organization_id: ORG, processed_at: null }],
  });
  try {
    const response = await POST(signed(payload));
    assert.equal(response.status, 503);
    assert.deepEqual(rpcNames(db.calls), []);
    assert.ok(db.calls.some((call) => call.path === "billing_webhook_events" && call.query.includes("select=")));
  } finally { db.restore(); }
});

test("processed billing receipt for another tenant fails closed", async () => {
  const payload = completed();
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{
      organization_id: ORG, package_key: "core", billing_interval: "monthly",
      state: "ready", reconciliation_evidence: null,
    }],
    "billing_webhook_events": ({ query }) => query.includes("on_conflict")
      ? []
      : [{ provider: "paddle", event_id: payload.event_id, organization_id: OTHER_ORG, processed_at: new Date().toISOString() }],
  });
  try {
    assert.equal((await POST(signed(payload))).status, 503);
    assert.deepEqual(rpcNames(db.calls), []);
  } finally { db.restore(); }
});

test("database failure when reading a conflicted billing receipt remains retryable", async () => {
  const payload = completed();
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{
      organization_id: ORG, package_key: "core", billing_interval: "monthly",
      state: "ready", reconciliation_evidence: null,
    }],
    "billing_webhook_events": ({ query }) => {
      if (query.includes("on_conflict")) return [];
      throw new Error("fixture: billing receipt could not be read");
    },
  });
  try {
    assert.equal((await POST(signed(payload))).status, 503);
    assert.deepEqual(rpcNames(db.calls), []);
  } finally { db.restore(); }
});

test("a released (canceled/abandoned) reservation can never admit a payment for paid access", async () => {
  const db = database({
    "billing_accounts": () => [],
    "billing_checkout_reservations": () => [{ organization_id: ORG, package_key: "core", billing_interval: "monthly", state: "reconciled", reconciliation_evidence: "released:abandoned:" + TXN }],
  });
  try {
    const response = await POST(signed(completed()));
    assert.equal(response.status, 503);
    assert.deepEqual(rpcNames(db.calls), []);
    assert.ok(!db.calls.some((c) => c.path === "billing_webhook_events"));
  } finally { db.restore(); }
});

test("reservation for another organization or package does not admit the payment", async () => {
  for (const row of [
    { organization_id: OTHER_ORG, package_key: "core", billing_interval: "monthly", state: "ready", reconciliation_evidence: null },
    { organization_id: ORG, package_key: "signal", billing_interval: "monthly", state: "ready", reconciliation_evidence: null },
    { organization_id: ORG, package_key: "core", billing_interval: "annual", state: "ready", reconciliation_evidence: null },
  ]) {
    const db = database({ "billing_accounts": () => [], "billing_checkout_reservations": () => [row] });
    try {
      const response = await POST(signed(completed()));
      assert.equal(response.status, 503);
      assert.deepEqual(rpcNames(db.calls), []);
    } finally { db.restore(); }
  }
});

test("a completed Foremention payment that cannot be mapped (quantity 2 / extra item) is never acknowledged as ignored", async () => {
  for (const items of [
    [{ quantity: 2, price: { id: CORE } }],
    [{ quantity: 1, price: { id: CORE } }, { quantity: 1, price: { id: SIGNAL } }],
    [{ quantity: 1, price: { id: FOREIGN } }], // our custom_data, unknown price
  ]) {
    const db = database({});
    try {
      const response = await POST(signed(completed({ items })));
      assert.equal(response.status, 503);
      assert.deepEqual(db.calls, [], "no database write and no grant");
    } finally { db.restore(); }
  }
});

test("an unrelated payment (foreign price, no Foremention custom data) is ignored with 200", async () => {
  const db = database({});
  try {
    const response = await POST(signed(completed({ items: [{ quantity: 1, price: { id: FOREIGN } }], custom: null })));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ignored, true);
    assert.deepEqual(db.calls, []);
  } finally { db.restore(); }
});

test("zero-value completed transactions are not payments and are ignored", async () => {
  const db = database({});
  try {
    const response = await POST(signed(completed({ items: [{ quantity: 2, price: { id: CORE } }], total: "0" })));
    assert.equal(response.status, 200);
    assert.deepEqual(db.calls, []);
  } finally { db.restore(); }
});

test("cancellation for an archived price is applied using the stored verified identity and package", async () => {
  const db = database({
    "billing_accounts": () => [{ organization_id: ORG, external_customer_id: CTM, external_subscription_id: SUB }],
    "organization_entitlements": () => [{ package_key: "signal", billing_source: "paddle" }],
    "billing_webhook_events": () => [{ provider: "paddle", event_id: "x", processed_at: null }],
    "rpc/apply_billing_event_atomic_v2": () => true,
  });
  try {
    const response = await POST(signed(lifecycle("subscription.canceled", "canceled")));
    assert.equal(response.status, 200);
    const apply = db.calls.find((c) => c.path === "rpc/apply_billing_event_atomic_v2").body;
    assert.equal(apply.p_state, "cancelled");
    assert.equal(apply.p_package_key, "signal");
    assert.equal(apply.p_legacy_status, "cancelled");
    assert.equal(apply.p_organization_id, ORG);
    assert.ok(!rpcNames(db.calls).includes("rpc/settle_paddle_checkout_reservation"));
  } finally { db.restore(); }
});

test("archived-price lifecycle with a different customer or non-Paddle entitlement fails closed", async () => {
  const cases = [
    { accounts: [{ organization_id: ORG, external_customer_id: CTM, external_subscription_id: SUB }], ent: [{ package_key: "core", billing_source: "paddle" }], customer: "ctm_" + "x".repeat(26) },
    { accounts: [{ organization_id: ORG, external_customer_id: CTM, external_subscription_id: SUB }], ent: [{ package_key: "core", billing_source: "founder" }], customer: CTM },
  ];
  for (const { accounts, ent, customer } of cases) {
    const db = database({ "billing_accounts": () => accounts, "organization_entitlements": () => ent });
    try {
      const response = await POST(signed(lifecycle("subscription.paused", "paused", ARCHIVED, customer)));
      assert.equal(response.status, 503);
      assert.deepEqual(rpcNames(db.calls), []);
    } finally { db.restore(); }
  }
});

test("lifecycle for a subscription Foremention never verified (foreign price) is ignored without writes", async () => {
  const db = database({ "billing_accounts": () => [] });
  try {
    const response = await POST(signed(lifecycle("subscription.canceled", "canceled", FOREIGN)));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ignored, true);
    assert.deepEqual(rpcNames(db.calls), []);
  } finally { db.restore(); }
});

test("lifecycle status that disagrees with the event type is ignored, never applied", async () => {
  const db = database({});
  try {
    const response = await POST(signed(lifecycle("subscription.canceled", "active")));
    assert.equal(response.status, 200);
    assert.deepEqual(db.calls, []);
  } finally { db.restore(); }
});

test("unsigned, stale or tampered deliveries are rejected before any database access", async () => {
  const db = database({});
  try {
    const good = signed(completed());
    const raw = await good.clone().text();
    const tampered = new Request(good.url, { method: "POST", headers: good.headers, body: raw.replace("9900", "1") });
    assert.equal((await POST(tampered)).status, 401);
    const stale = new Request(good.url, { method: "POST", headers: { "paddle-signature": "ts=1700000000;h1=" + "0".repeat(64) }, body: raw });
    assert.equal((await POST(stale)).status, 401);
    const missing = new Request(good.url, { method: "POST", body: raw });
    assert.equal((await POST(missing)).status, 401);
    assert.deepEqual(db.calls, []);
  } finally { db.restore(); }
});

// Oct 18: subscription.updated may only reduce access (strict downgrade).
function updated({ price = CORE, status = "active", customer = CTM, endsInDays = 20 } = {}) {
  const now = Date.now();
  return {
    event_id: eventId(),
    event_type: "subscription.updated",
    occurred_at: new Date(now - 1000).toISOString(),
    data: {
      id: SUB, status, customer_id: customer, custom_data: null,
      items: [{ quantity: 1, price: { id: price } }],
      current_billing_period: { starts_at: new Date(now - 10 * 864e5).toISOString(), ends_at: new Date(now + endsInDays * 864e5).toISOString() },
    },
  };
}

function downgradeDb(storedPackage, accounts = [{ organization_id: ORG, external_customer_id: CTM, external_subscription_id: SUB }]) {
  return database({
    "billing_accounts": () => accounts,
    "organization_entitlements": () => [{ package_key: storedPackage, billing_source: "paddle" }],
    "billing_webhook_events": () => [{ provider: "paddle", event_id: "x", processed_at: null }],
    "rpc/apply_billing_event_atomic_v2": () => true,
  });
}

test("subscription.updated Signal -> Core downgrade applies Core, bounded by the current billing period", async () => {
  const db = downgradeDb("signal");
  try {
    const payload = updated({ price: CORE });
    const response = await POST(signed(payload));
    assert.equal(response.status, 200);
    const apply = db.calls.find((c) => c.path === "rpc/apply_billing_event_atomic_v2").body;
    assert.equal(apply.p_package_key, "core");
    assert.equal(apply.p_state, "active");
    assert.equal(apply.p_organization_id, ORG);
    assert.equal(apply.p_external_subscription_id, SUB);
    assert.ok(apply.p_entitlement_expires_at, "a downgrade must never produce unbounded access");
    assert.ok(new Date(apply.p_entitlement_expires_at) > new Date(payload.data.current_billing_period.ends_at) - 1);
    assert.ok(!rpcNames(db.calls).includes("rpc/settle_paddle_checkout_reservation"));
  } finally { db.restore(); }
});

test("subscription.updated never grants: upgrade, same plan or renewal is acknowledged without writes", async () => {
  for (const [stored, price] of [["core", SIGNAL], ["core", CORE], ["signal", SIGNAL]]) {
    const db = downgradeDb(stored);
    try {
      const response = await POST(signed(updated({ price })));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ignored, true);
      assert.deepEqual(rpcNames(db.calls), []);
    } finally { db.restore(); }
  }
});

test("subscription.updated for a non-active, foreign, period-less or unverified subscription changes nothing", async () => {
  // Non-active status, foreign price, missing/expired period: parser declines, no database access.
  for (const payload of [updated({ status: "past_due" }), updated({ status: "paused" }), updated({ price: FOREIGN }), updated({ endsInDays: -1 })]) {
    const db = downgradeDb("signal");
    try {
      const response = await POST(signed(payload));
      assert.equal(response.status, 200);
      assert.deepEqual(rpcNames(db.calls), []);
    } finally { db.restore(); }
  }
  // Subscription Foremention never verified: ignored without writes.
  const none = downgradeDb("signal", []);
  try {
    const response = await POST(signed(updated()));
    assert.equal(response.status, 200);
    assert.deepEqual(rpcNames(none.calls), []);
  } finally { none.restore(); }
  // Stored identity with a different customer: fail closed (retryable), no writes.
  const mismatch = downgradeDb("signal");
  try {
    const response = await POST(signed(updated({ customer: "ctm_" + "x".repeat(26) })));
    assert.equal(response.status, 503);
    assert.deepEqual(rpcNames(mismatch.calls), []);
  } finally { mismatch.restore(); }
});

test("subscription.updated against a non-Paddle (founder) entitlement is ignored", async () => {
  const db = database({
    "billing_accounts": () => [{ organization_id: ORG, external_customer_id: CTM, external_subscription_id: SUB }],
    "organization_entitlements": () => [{ package_key: "signal", billing_source: "founder" }],
  });
  try {
    const response = await POST(signed(updated()));
    assert.equal(response.status, 200);
    assert.deepEqual(rpcNames(db.calls), []);
  } finally { db.restore(); }
});
