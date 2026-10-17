import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validatePaddlePaidPeriod, reconcilePaddlePaidPeriod } from "../lib/paddle-paid-period.ts";

const startEnv = { ...process.env };
const customer = "ctm_" + "a".repeat(26);
const subscription = "sub_" + "b".repeat(26);
const price = "pri_" + "c".repeat(26);
const now = new Date("2026-10-12T13:00:00.000Z");
const identity = {
  subscriptionId: subscription,
  customerId: customer,
  packageKey: "core",
  billingInterval: "monthly",
  occurredAt: "2026-10-12T12:00:00.000Z",
};
const fixture = {
  id: subscription, customer_id: customer, status: "active",
  items: [{ quantity: 1, price: { id: price } }],
  current_billing_period: {
    starts_at: "2026-10-12T11:59:00.000Z",
    ends_at: "2026-11-12T11:59:00.000Z",
  },
};
const end = "2026-11-12T11:59:00.000Z";

function configure() {
  process.env.NODE_ENV = "test";
  process.env.BILLING_PROVIDER_ID = "paddle";
  process.env.PADDLE_ENVIRONMENT = "sandbox";
  process.env.PADDLE_API_KEY = "test_sandbox_mock_key";
  process.env.PADDLE_WEBHOOK_SECRET = "test_sandbox_mock_secret";
  process.env.PADDLE_CORE_MONTHLY_PRICE_ID = price;
  delete process.env.PADDLE_SIGNAL_MONTHLY_PRICE_ID;
  delete process.env.PADDLE_CORE_ANNUAL_PRICE_ID;
  delete process.env.PADDLE_SIGNAL_ANNUAL_PRICE_ID;
}

test.afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in startEnv)) delete process.env[k];
  Object.assign(process.env, startEnv);
});

test("initial checkout with null transaction billing period gets exact bounded expiry from valid subscription", async () => {
  configure();
  assert.equal(validatePaddlePaidPeriod(fixture, identity, now), end);
  let requestCount = 0;
  const result = await reconcilePaddlePaidPeriod(identity, now, async (url, opts) => {
    requestCount += 1;
    assert.equal(String(url), "https://sandbox-api.paddle.com/subscriptions/" + subscription);
    assert.equal(opts.method, "GET");
    assert.equal(opts.redirect, "error");
    assert.equal(opts.cache, "no-store");
    assert.equal(opts.headers.Authorization, "Bearer test_sandbox_mock_key");
    return new Response(JSON.stringify({ data: fixture }), { status: 200 });
  });
  assert.equal(requestCount, 1);
  assert.equal(result, end);
});

test("mismatched tenant customer, subscription, package, interval or quantity never authorizes paid access", () => {
  configure();
  for (const invalid of [
    { id: "sub_" + "d".repeat(26) },
    { customer_id: "ctm_" + "d".repeat(26) },
    { status: "past_due" }, { status: "paused" }, { status: "canceled" },
    { items: [{ quantity: 2, price: { id: price } }] },
    { items: [{ quantity: 1, price: { id: "pri_" + "d".repeat(26) } }] },
    { items: [] },
    { current_billing_period: null },
  ]) {
    assert.equal(validatePaddlePaidPeriod({ ...fixture, ...invalid }, identity, now), null);
  }
  assert.equal(validatePaddlePaidPeriod(fixture, { ...identity, packageKey: "signal" }, now), null);
  assert.equal(validatePaddlePaidPeriod(fixture, { ...identity, billingInterval: "annual" }, now), null);
});

test("invalid, future, expired and out-of-order billing periods fail closed", () => {
  configure();
  const periodCases = [
    { starts_at: "2026-10-13T00:00:00Z", ends_at: "2026-11-13T00:00:00Z" },
    { starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-10-01T00:00:00Z" },
    { starts_at: "2026-10-12T13:00:00Z", ends_at: "2026-10-12T12:00:00Z" },
    { starts_at: "not-a-date", ends_at: end },
    { starts_at: "2026-10-12T11:59:00Z", ends_at: "not-a-date" },
  ];
  for (const period of periodCases) {
    assert.equal(validatePaddlePaidPeriod({ ...fixture, current_billing_period: period }, identity, now), null);
  }
});

test("missing provider configuration or unresolved API response never grants access", async () => {
  configure();
  const failedApi = async () => new Response(JSON.stringify({ data: { ...fixture, status: "trialing" } }), { status: 200 });
  await assert.rejects(() => reconcilePaddlePaidPeriod(identity, now, failedApi), /missing or mismatched/);
  await assert.rejects(() => reconcilePaddlePaidPeriod(identity, now, async () => new Response("{}", { status: 503 })), /could not be reconciled/);
  delete process.env.PADDLE_API_KEY;
  await assert.rejects(() => reconcilePaddlePaidPeriod(identity, now, async () => {
    throw new Error("must never call provider without config");
  }), /unavailable/);
});

test("paid period lookup is after verified checkout/renewal correlation and before ledger mutation", async () => {
  const route = await readFile(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  const checked = route.indexOf("paddlePaidTransactionAdmitted(parsed, organizationId)");
  const resolved = route.indexOf("await reconcilePaddlePaidPeriod({");
  const applied = route.indexOf("return billingMutationResponse(event, provider.id, settlement, fromVerifiedInbox)");
  assert.ok(checked > -1 && resolved > checked && applied > resolved);
  assert.match(route, /if \(parsed\.externalTransactionId && !parsed\.accessUntil\)/);
  assert.match(route, /\? \{ accessUntil: reconciledPaidThrough \} : \{\}/);
  assert.match(route, /status: 503/);
});
