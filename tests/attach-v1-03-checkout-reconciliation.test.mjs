// Chat03: checkout reservation recovery (A02/CV-06). Pure decision fixtures
// plus runtime fixtures for /api/billing/checkout/reconcile with stubbed
// auth/workspace, an in-memory PostgREST double and a mocked Paddle Sandbox
// API. No real Paddle request, charge, cancel or database write happens.
import "./attach-v1-03-support/register.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const ORG = "11111111-1111-4111-8111-111111111111";
const RES = "22222222-2222-4222-8222-222222222222";
const TXN = "txn_" + "t".repeat(26);
const CORE = "pri_" + "c".repeat(26);

Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PUBLIC_SITE_URL: "https://foremention.test",
  NEXT_PUBLIC_SUPABASE_URL: "https://db.attach03.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-mock",
  SUPABASE_SERVICE_ROLE_KEY: "service-mock",
  BILLING_PROVIDER_ID: "paddle",
  PADDLE_ENVIRONMENT: "sandbox",
  PADDLE_SANDBOX_ADAPTER_ENABLED: "1",
  PADDLE_API_KEY: "pdl_sdbx_mock_key",
  PADDLE_WEBHOOK_SECRET: "mock-webhook-signing-secret",
  PADDLE_CORE_MONTHLY_PRICE_ID: CORE,
});
delete process.env.PADDLE_LIVE_ENABLED;

const { decidePaddleReservation, reservationAdmitsPaidTransaction, ABANDONED_CHECKOUT_MINUTES } = await import("../lib/paddle-checkout-reconciliation.ts");
const { POST } = await import("../app/api/billing/checkout/reconcile/route.ts");
const stub = globalThis.__attach03Stub;

const now = new Date("2026-10-13T08:00:00.000Z");
const reservation = (over = {}) => ({
  id: RES, organization_id: ORG, package_key: "core", billing_interval: "monthly",
  state: "ready", external_transaction_id: TXN,
  created_at: new Date(now.getTime() - (ABANDONED_CHECKOUT_MINUTES + 5) * 60_000).toISOString(),
  ...over,
});
const txn = (over = {}) => ({
  id: TXN, status: "ready", origin: "api",
  custom_data: { organizationId: ORG, checkoutReservationId: RES, packageKey: "core", billingInterval: "monthly" },
  ...over,
});

test("decision: completed provider transaction settles as paid evidence only (no grant)", () => {
  assert.deepEqual(decidePaddleReservation(reservation(), txn({ status: "completed" }), now),
    { action: "settle_paid", reason: "provider_completed", evidence: "paid:" + TXN });
});

test("decision: paid/billed waits for Paddle; canceled releases; past_due needs review", () => {
  assert.equal(decidePaddleReservation(reservation(), txn({ status: "paid" }), now).action, "await_provider");
  assert.equal(decidePaddleReservation(reservation(), txn({ status: "billed" }), now).action, "await_provider");
  assert.deepEqual(decidePaddleReservation(reservation(), txn({ status: "canceled" }), now),
    { action: "release", reason: "provider_canceled", evidence: "released:canceled:" + TXN });
  assert.equal(decidePaddleReservation(reservation(), txn({ status: "past_due" }), now).action, "manual_review");
  assert.equal(decidePaddleReservation(reservation(), txn({ status: "mystery" }), now).action, "manual_review");
});

test("decision: an open checkout is kept until the abandonment window, then cancel-then-release", () => {
  const fresh = reservation({ created_at: new Date(now.getTime() - 5 * 60_000).toISOString() });
  assert.equal(decidePaddleReservation(fresh, txn({ status: "ready" }), now).action, "keep");
  assert.equal(decidePaddleReservation(fresh, txn({ status: "draft" }), now).action, "keep");
  assert.deepEqual(decidePaddleReservation(reservation(), txn({ status: "ready" }), now),
    { action: "cancel_then_release", reason: "checkout_abandoned", evidence: "released:abandoned:" + TXN });
});

test("decision: any identity doubt is manual review, never release or settle", () => {
  for (const [res, provider] of [
    [reservation({ state: "uncertain" }), txn()],
    [reservation({ external_transaction_id: null, state: "reserved" }), txn()],
    [reservation({ external_transaction_id: "txn_bad" }), txn()],
    [reservation(), null],
    [reservation(), txn({ id: "txn_" + "x".repeat(26) })],
    [reservation(), txn({ custom_data: { organizationId: "99999999-9999-4999-8999-999999999999", checkoutReservationId: RES } })],
    [reservation(), txn({ custom_data: { organizationId: ORG, checkoutReservationId: "33333333-3333-4333-8333-333333333333" } })],
    [reservation(), txn({ custom_data: null })],
    [reservation(), txn({ origin: "subscription_recurring", status: "completed" })],
    [reservation({ created_at: "not-a-date" }), txn({ status: "ready" })],
  ]) {
    assert.equal(decidePaddleReservation(res, provider, now).action, "manual_review");
  }
  assert.equal(decidePaddleReservation(reservation({ state: "reconciled" }), txn(), now).action, "none");
});

test("webhook admission: ready admits; settled admits only its own paid transaction", () => {
  const expected = { organizationId: ORG, packageKey: "core", billingInterval: "monthly", transactionId: TXN };
  const row = { organization_id: ORG, package_key: "core", billing_interval: "monthly" };
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "ready" }, expected), true);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "reconciled", reconciliation_evidence: "paid:" + TXN }, expected), true);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "reconciled", reconciliation_evidence: "paid:txn_" + "o".repeat(26) }, expected), false);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "reconciled", reconciliation_evidence: "released:abandoned:" + TXN }, expected), false);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "uncertain" }, expected), false);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, state: "reserved" }, expected), false);
  assert.equal(reservationAdmitsPaidTransaction({ ...row, package_key: "signal", state: "ready" }, expected), false);
});

// ---------------------------------------------------------------- runtime
function world({ reservations, paddle }) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ host: url.host, path: url.pathname, method: init.method || "GET", body });
    if (url.host === "sandbox-api.paddle.com") {
      assert.equal(init.headers.Authorization, "Bearer pdl_sdbx_mock_key");
      const result = paddle(init.method || "GET", body);
      return new Response(JSON.stringify(result.body), { status: result.status });
    }
    assert.equal(url.host, "db.attach03.invalid", "no other network");
    const path = url.pathname.replace("/rest/v1/", "");
    if (path === "billing_checkout_reservations") return Response.json(reservations);
    if (path.startsWith("rpc/")) return Response.json(true);
    return Response.json([]);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}
const request = (origin = "https://foremention.test") => new Request("https://foremention.test/api/billing/checkout/reconcile", { method: "POST", headers: origin ? { origin } : {} });
function asOwner() {
  stub.viewer = { mode: "live", email: "owner@example.test", accessToken: "user-token" };
  stub.role = "owner";
  stub.context = { organizationId: ORG };
}

test("route: abandoned checkout is cancelled at Paddle, re-read as canceled, then released", async () => {
  asOwner();
  let status = "ready";
  const w = world({
    reservations: [reservation({ created_at: new Date(Date.now() - 3 * 3600_000).toISOString() })],
    paddle: (method) => {
      if (method === "PATCH") { status = "canceled"; return { status: 200, body: { data: txn({ status }) } }; }
      return { status: 200, body: { data: txn({ status }) } };
    },
  });
  try {
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { action: "cancel_then_release", reason: "checkout_abandoned" });
    const paddleCalls = w.calls.filter((c) => c.host === "sandbox-api.paddle.com").map((c) => c.method);
    assert.deepEqual(paddleCalls, ["GET", "PATCH", "GET"]);
    assert.deepEqual(w.calls.find((c) => c.method === "PATCH").body, { status: "canceled" });
    const release = w.calls.find((c) => c.path.endsWith("rpc/release_paddle_checkout_reservation"));
    assert.deepEqual(release.body, { p_reservation_id: RES, p_organization_id: ORG, p_evidence: "released:abandoned:" + TXN });
    assert.ok(!w.calls.some((c) => c.path.includes("apply_billing_event")), "never grants entitlement");
  } finally { w.restore(); }
});

test("route: a payment that races the cancel wins — no release, manual review", async () => {
  asOwner();
  let reads = 0;
  const w = world({
    reservations: [reservation({ created_at: new Date(Date.now() - 3 * 3600_000).toISOString() })],
    paddle: (method) => {
      if (method === "PATCH") return { status: 200, body: { data: txn({ status: "completed" }) } };
      reads += 1;
      return { status: 200, body: { data: txn({ status: reads === 1 ? "ready" : "completed" }) } };
    },
  });
  try {
    const response = await POST(request());
    assert.equal(response.status, 409);
    assert.equal((await response.json()).data.reason, "cancel_not_confirmed");
    assert.ok(!w.calls.some((c) => c.path.includes("rpc/release_paddle_checkout_reservation")));
  } finally { w.restore(); }
});

test("route: completed checkout is settled with paid evidence; still no entitlement write", async () => {
  asOwner();
  const w = world({ reservations: [reservation()], paddle: () => ({ status: 200, body: { data: txn({ status: "completed" }) } }) });
  try {
    const response = await POST(request());
    assert.equal(response.status, 200);
    const settle = w.calls.find((c) => c.path.endsWith("rpc/settle_paddle_checkout_reservation"));
    assert.deepEqual(settle.body, { p_organization_id: ORG, p_transaction_id: TXN, p_evidence: "paid:" + TXN });
    assert.ok(!w.calls.some((c) => c.method === "PATCH"));
    assert.ok(!w.calls.some((c) => c.path.includes("apply_billing_event")));
  } finally { w.restore(); }
});

test("route: uncertain reservation never calls Paddle and asks for manual review", async () => {
  asOwner();
  const w = world({ reservations: [reservation({ state: "uncertain", external_transaction_id: null })], paddle: () => { throw new Error("must not call Paddle"); } });
  try {
    const response = await POST(request());
    assert.equal(response.status, 409);
    assert.equal((await response.json()).data.action, "manual_review");
    assert.ok(!w.calls.some((c) => c.host === "sandbox-api.paddle.com"));
  } finally { w.restore(); }
});

test("route: Paddle outage is a retryable 503 with no state change", async () => {
  asOwner();
  const w = world({ reservations: [reservation()], paddle: () => ({ status: 500, body: { error: { code: "internal" } } }) });
  try {
    const response = await POST(request());
    assert.equal(response.status, 503);
    assert.ok(!w.calls.some((c) => c.path.startsWith("/rest/v1/rpc/")));
  } finally { w.restore(); }
});

test("route: untrusted origin, non-owner and demo viewers are refused before any read", async () => {
  const w = world({ reservations: [reservation()], paddle: () => { throw new Error("must not call Paddle"); } });
  try {
    asOwner();
    assert.equal((await POST(request("https://evil.example"))).status, 403);
    assert.equal((await POST(request(null))).status, 403);
    stub.role = "analyst";
    assert.equal((await POST(request())).status, 403);
    asOwner();
    stub.viewer = { mode: "demo" };
    assert.equal((await POST(request())).status, 403);
    assert.deepEqual(w.calls, []);
  } finally { w.restore(); }
});

test("route: no unresolved reservation is a no-op", async () => {
  asOwner();
  const w = world({ reservations: [], paddle: () => { throw new Error("must not call Paddle"); } });
  try {
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { action: "none", reason: "no_unresolved_checkout" });
  } finally { w.restore(); }
});
