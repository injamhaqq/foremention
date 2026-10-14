// Chat03: billing status (pending checkout + effective numeric limit), the
// redirect-never-grants return notice, and the fail-closed live default
// payment-link page gate. Runtime fixtures with mocks only.
import "./attach-v1-03-support/register.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ORG = "11111111-1111-4111-8111-111111111111";
const CORE = "pri_" + "c".repeat(26);
const startEnv = { ...process.env };
function baseEnv() {
  for (const k of Object.keys(process.env)) if (!(k in startEnv)) delete process.env[k];
  Object.assign(process.env, startEnv, {
    NODE_ENV: "test",
    NEXT_PUBLIC_SITE_URL: "https://foremention.com",
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
}
baseEnv();

const { GET } = await import("../app/api/billing/status/route.ts");
const { billingReturnNotice } = await import("../lib/billing-return-notice.ts");
const { paddleLiveCheckoutClientToken } = await import("../lib/paddle-payment-page.ts");
const stub = globalThis.__attach03Stub;

function db(tables) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/rest/v1/", "");
    calls.push({ path, auth: init.headers?.authorization });
    const value = tables[path];
    if (value instanceof Error) return new Response("{}", { status: 503 });
    return Response.json(value ?? []);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}
function owner() {
  stub.viewer = { mode: "live", email: "o@example.test", accessToken: "user-token" };
  stub.role = "owner";
  stub.context = { organizationId: ORG };
}

test.afterEach(() => baseEnv());

test("status: an open checkout is reported as pending and hides new checkout offers", async () => {
  owner();
  const d = db({
    billing_accounts: [],
    organization_entitlements: [],
    billing_checkout_reservations: [{ state: "ready", created_at: "2026-10-13T07:00:00.000Z" }],
  });
  try {
    const { data } = await (await GET()).json();
    assert.deepEqual(data.checkoutPending, { state: "ready", createdAt: "2026-10-13T07:00:00.000Z" });
    assert.deepEqual(data.checkoutOffers, []);
    assert.equal(data.packageKey, "private_beta");
    assert.equal(data.buyerQuestionLimit, 5);
    const reservationRead = d.calls.find((c) => c.path === "billing_checkout_reservations");
    assert.equal(reservationRead.auth, "Bearer service-mock", "reservations are service-only; read scoped server-side");
  } finally { d.restore(); }
});

test("status: no pending checkout keeps configured offers for the owner", async () => {
  owner();
  const d = db({ billing_accounts: [], organization_entitlements: [], billing_checkout_reservations: [] });
  try {
    const { data } = await (await GET()).json();
    assert.equal(data.checkoutPending, null);
    assert.deepEqual(data.checkoutOffers, [{ packageKey: "core", billingInterval: "monthly" }]);
  } finally { d.restore(); }
});

test("status: numeric limit comes only from active, unexpired verified entitlement (A03)", async () => {
  owner();
  const future = new Date(Date.now() + 864e5).toISOString();
  const past = new Date(Date.now() - 1000).toISOString();
  for (const [row, expected] of [
    [{ package_key: "core", status: "active", expires_at: future, billing_source: "paddle", max_prompts: 25 }, 25],
    [{ package_key: "signal", status: "active", expires_at: future, billing_source: "paddle", max_prompts: 100 }, 100],
    [{ package_key: "signal", status: "active", expires_at: future, billing_source: "paddle", max_prompts: 5000 }, 100],
    [{ package_key: "signal", status: "active", expires_at: past, billing_source: "paddle", max_prompts: 100 }, 5],
    [{ package_key: "core", status: "cancelled", expires_at: null, billing_source: "paddle", max_prompts: 25 }, 5],
    [{ package_key: "core", status: "paused", expires_at: null, billing_source: "paddle", max_prompts: 25 }, 5],
  ]) {
    const d = db({ billing_accounts: [], organization_entitlements: [row], billing_checkout_reservations: [] });
    try {
      const { data } = await (await GET()).json();
      assert.equal(data.buyerQuestionLimit, expected, JSON.stringify(row));
    } finally { d.restore(); }
  }
});

test("status: a non-owner never triggers the service-role reservation read", async () => {
  owner();
  stub.role = "analyst";
  const d = db({ billing_accounts: [], organization_entitlements: [] });
  try {
    const { data } = await (await GET()).json();
    assert.equal(data.checkoutPending, null);
    assert.ok(!d.calls.some((c) => c.path === "billing_checkout_reservations"));
  } finally { d.restore(); }
});

test("status: reservation read outage fails closed with 503", async () => {
  owner();
  const d = db({ billing_accounts: [], organization_entitlements: [], billing_checkout_reservations: new Error("down") });
  try {
    assert.equal((await GET()).status, 503);
  } finally { d.restore(); }
});

test("return notice: ?billing=success never claims paid access without a verified entitlement", () => {
  const unpaid = { packageKey: "private_beta", entitlementStatus: "active", state: "unconfigured" };
  assert.match(billingReturnNotice("?billing=success", unpaid), /confirmation is pending/);
  assert.match(billingReturnNotice("?billing=success", { packageKey: "core", entitlementStatus: "active", state: "past_due" }), /pending/);
  assert.match(billingReturnNotice("?billing=success", { packageKey: "core", entitlementStatus: "active", state: "active" }), /verified billing event/);
  assert.match(billingReturnNotice("?billing=cancelled", unpaid), /No paid access/);
  assert.equal(billingReturnNotice("", unpaid), null);
});

function liveEnv(over = {}) {
  Object.assign(process.env, {
    BILLING_PROVIDER_ID: "paddle",
    PADDLE_ENVIRONMENT: "live",
    PADDLE_LIVE_ENABLED: "1",
    PADDLE_API_KEY: "pdl_live_mock_key",
    PADDLE_WEBHOOK_SECRET: "mock-webhook-signing-secret",
    PADDLE_LIVE_CHECKOUT_PAGE_ENABLED: "1",
    PADDLE_LIVE_CLIENT_TOKEN: "live_mocktoken123",
    NEXT_PUBLIC_SITE_URL: "https://foremention.com",
    ...over,
  });
  delete process.env.PADDLE_SANDBOX_ADAPTER_ENABLED;
}

test("live payment page: opens only with every live gate and the canonical host", () => {
  liveEnv();
  assert.equal(paddleLiveCheckoutClientToken("foremention.com"), "live_mocktoken123");
  assert.equal(paddleLiveCheckoutClientToken("FOREMENTION.COM:443"), "live_mocktoken123");
  assert.equal(paddleLiveCheckoutClientToken("staging.example.com"), null);
  assert.equal(paddleLiveCheckoutClientToken(null), null);
});

test("live payment page: each missing gate keeps it closed", () => {
  for (const over of [
    { PADDLE_LIVE_CHECKOUT_PAGE_ENABLED: "0" },
    { PADDLE_LIVE_ENABLED: "0" },
    { PADDLE_ENVIRONMENT: "sandbox" },
    { PADDLE_API_KEY: "pdl_sdbx_mock_key" },
    { PADDLE_LIVE_CLIENT_TOKEN: "test_sandboxtoken" },
    { BILLING_PROVIDER_ID: "stripe" },
    { NEXT_PUBLIC_SITE_URL: "http://foremention.com" },
    { PADDLE_WEBHOOK_SECRET: "" },
  ]) {
    baseEnv();
    liveEnv(over);
    assert.equal(paddleLiveCheckoutClientToken("foremention.com"), null, JSON.stringify(over));
  }
  baseEnv();
  liveEnv();
  delete process.env.PADDLE_CORE_MONTHLY_PRICE_ID; // live defaults still map catalog prices
  assert.equal(paddleLiveCheckoutClientToken("foremention.com"), "live_mocktoken123");
});

test("live payment page: unset switch and unset token use the in-code browser-safe defaults", () => {
  baseEnv();
  liveEnv({ PADDLE_LIVE_CLIENT_TOKEN: "" });
  delete process.env.PADDLE_LIVE_CHECKOUT_PAGE_ENABLED;
  assert.match(paddleLiveCheckoutClientToken("foremention.com") || "", /^live_[a-z0-9]+$/);
  liveEnv({ PADDLE_LIVE_CHECKOUT_PAGE_ENABLED: "0" });
  assert.equal(paddleLiveCheckoutClientToken("foremention.com"), null);
});

test("payment page source: live branch is separate, sandbox gate unchanged, no secrets reach the client", async () => {
  const page = await readFile(new URL("../app/pay/page.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../components/paddle-sandbox-payment.tsx", import.meta.url), "utf8");
  assert.match(page, /paddleLiveCheckoutClientToken\(requestHost\)/);
  assert.match(page, /available \? null : paddleLiveCheckoutClientToken/);
  assert.match(page, /environment="live"/);
  assert.match(client, /if \(!live\) paddle\.Environment\.set\("sandbox"\)/);
  assert.ok(!client.includes("PADDLE_API_KEY") && !client.includes("PADDLE_WEBHOOK_SECRET"));
  assert.ok(!page.includes("PADDLE_LIVE_CLIENT_TOKEN"), "live token is read only in the server-side gate");
});

test("checkout: a definitive Paddle 4xx rejection releases the reservation instead of stranding it", async () => {
  const route = await readFile(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8");
  const lib = await readFile(new URL("../lib/paddle-billing.ts", import.meta.url), "utf8");
  const sql = await readFile(new URL("../supabase/migrations/20261014150000_release_rejected_paddle_checkout.sql", import.meta.url), "utf8");
  assert.match(lib, /!\[408, 409, 429\]\.includes\(response\.status\)/);
  assert.ok(route.indexOf("error instanceof PaddleRequestRejectedError") < route.indexOf("rpc/mark_paddle_checkout_uncertain"));
  assert.match(route, /rpc\/release_rejected_paddle_checkout/);
  assert.match(sql, /external_transaction_id is null/);
  assert.match(sql, /grant execute on function public\.release_rejected_paddle_checkout\(uuid, uuid, text\) to service_role/);
  assert.match(sql, /from public, anon, authenticated/);
});
