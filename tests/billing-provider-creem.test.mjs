import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const original = { ...process.env };
const read = (path) => readFile(new URL(path, root), "utf8");

function restoreEnv() {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
}
test.afterEach(restoreEnv);

test("billing routes depend on a provider-neutral adapter rather than Stripe directly", async () => {
  const [adapter, checkout, portal, status, webhook, ui] = await Promise.all([
    read("lib/billing-provider.ts"),
    read("app/api/billing/checkout/route.ts"),
    read("app/api/billing/portal/route.ts"),
    read("app/api/billing/status/route.ts"),
    read("app/api/billing/webhook/route.ts"),
    read("components/billing-control.tsx"),
  ]);
  assert.match(adapter, /interface BillingProviderAdapter|type BillingProviderAdapter/);
  assert.match(adapter, /stripe/);
  assert.match(adapter, /creem/);
  for (const source of [checkout, portal, status, webhook]) {
    assert.match(source, /billing-provider/);
    assert.doesNotMatch(source, /@\/lib\/stripe-billing/);
  }
  assert.doesNotMatch(ui, /Stripe Customer Portal|Stripe Prices/);
});

test("Creem stays fail-closed and exposes only explicitly configured product offers", async () => {
  const billing = await import("../lib/creem-billing.ts");
  delete process.env.BILLING_PROVIDER_ID;
  delete process.env.CREEM_ENVIRONMENT;
  delete process.env.CREEM_API_KEY;
  delete process.env.CREEM_WEBHOOK_SECRET;
  delete process.env.CREEM_CORE_MONTHLY_PRODUCT_ID;
  assert.equal(billing.creemBillingConfigured(), false);

  process.env.BILLING_PROVIDER_ID = "creem";
  process.env.CREEM_ENVIRONMENT = "test";
  process.env.CREEM_API_KEY = "creem_test_example";
  process.env.CREEM_WEBHOOK_SECRET = "creem_whsec_example";
  process.env.CREEM_CORE_MONTHLY_PRODUCT_ID = "prod_core_monthly";
  process.env.NODE_ENV = "test";
  assert.equal(billing.creemBillingConfigured(), true);
  assert.equal(billing.creemProductIdFor("core", "monthly"), "prod_core_monthly");
  assert.equal(billing.creemProductIdFor("signal", "monthly"), null);

  process.env.NODE_ENV = "production";
  assert.equal(billing.creemBillingConfigured(), false);
  process.env.CREEM_ENVIRONMENT = "live";
  process.env.CREEM_LIVE_ENABLED = "1";
  assert.equal(billing.creemBillingConfigured(), true);
});

test("Creem webhook verification uses the raw body HMAC-SHA256 signature", async () => {
  const { verifyCreemWebhook } = await import("../lib/creem-billing.ts");
  process.env.CREEM_WEBHOOK_SECRET = "test_creem_secret";
  const raw = JSON.stringify({ id: "evt_1", eventType: "subscription.paid", object: {} });
  const signature = crypto.createHmac("sha256", process.env.CREEM_WEBHOOK_SECRET).update(raw).digest("hex");
  assert.equal(await verifyCreemWebhook(raw, signature), true);
  await assert.rejects(() => verifyCreemWebhook(raw, "00".repeat(32)), /signature/i);
});

test("Creem lifecycle parsing derives package from configured product IDs and normalizes lifecycle", async () => {
  const { parseCreemBillingEvent } = await import("../lib/creem-billing.ts");
  process.env.CREEM_SIGNAL_MONTHLY_PRODUCT_ID = "prod_signal";
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const paid = JSON.stringify({
    id: "evt_paid",
    eventType: "subscription.paid",
    created_at: 1791360000000,
    object: {
      id: "sub_123",
      status: "active",
      product: { id: "prod_signal" },
      customer: { id: "cust_123" },
      metadata: { organizationId, packageKey: "core" }
    }
  });
  assert.deepEqual(parseCreemBillingEvent(paid), {
    organizationId,
    packageKey: "signal",
    state: "active",
    externalCustomerId: "cust_123",
    externalSubscriptionId: "sub_123",
    eventId: "evt_paid",
    occurredAt: new Date(1791360000000).toISOString(),
  });

  const pastDue = JSON.stringify({
    id: "evt_due",
    eventType: "subscription.past_due",
    created_at: 1791360001000,
    object: {
      id: "sub_123",
      status: "past_due",
      product: { id: "prod_signal" },
      customer: { id: "cust_123" },
      metadata: {}
    }
  });
  const parsed = parseCreemBillingEvent(pastDue);
  assert.equal(parsed?.organizationId, null);
  assert.equal(parsed?.packageKey, "signal");
  assert.equal(parsed?.state, "past_due");
  assert.equal(parsed?.externalSubscriptionId, "sub_123");

  const scheduled = JSON.stringify({
    id: "evt_scheduled",
    eventType: "subscription.scheduled_cancel",
    object: { id: "sub_123", product: { id: "prod_signal" }, customer: { id: "cust_123" } }
  });
  assert.equal(parseCreemBillingEvent(scheduled), null);
});

test("Creem cancellation preserves paid-through access and expired retry events do not revoke access", async () => {
  const { parseCreemBillingEvent } = await import("../lib/creem-billing.ts");
  process.env.CREEM_CORE_MONTHLY_PRODUCT_ID = "prod_core";
  const periodEnd = "2026-11-01T00:00:00.000Z";
  const canceled = parseCreemBillingEvent(JSON.stringify({
    id: "evt_cancel",
    eventType: "subscription.canceled",
    created_at: 1791360002000,
    object: {
      id: "sub_cancel",
      object: "subscription",
      status: "canceled",
      product: { id: "prod_core" },
      customer: { id: "cust_cancel" },
      current_period_end_date: periodEnd,
      metadata: {}
    }
  }));
  assert.equal(canceled?.state, "cancelled");
  assert.equal(canceled?.accessUntil, periodEnd);

  const expired = parseCreemBillingEvent(JSON.stringify({
    id: "evt_expired",
    eventType: "subscription.expired",
    created_at: 1791360003000,
    object: {
      id: "sub_cancel",
      object: "subscription",
      status: "active",
      product: { id: "prod_core" },
      customer: { id: "cust_cancel" },
      current_period_end_date: periodEnd,
      metadata: {}
    }
  }));
  assert.equal(expired, null);
});

test("provider identity reconciliation rejects metadata conflicts and ambiguous external mappings", async () => {
  const { reconcileBillingOrganization } = await import("../lib/billing-provider.ts");
  const orgA = "11111111-1111-4111-8111-111111111111";
  const orgB = "22222222-2222-4222-8222-222222222222";

  assert.equal(reconcileBillingOrganization(orgA, null, null), orgA);
  assert.equal(reconcileBillingOrganization(null, orgA, null), orgA);
  assert.equal(reconcileBillingOrganization(null, null, orgA), orgA);
  assert.equal(reconcileBillingOrganization(orgA, orgA, orgA), orgA);
  assert.equal(reconcileBillingOrganization(orgB, orgA, orgA), null);
  assert.equal(reconcileBillingOrganization(null, orgA, orgB), null);
});

test("Creem checkout and portal use the official REST endpoints and server-derived metadata", async () => {
  const source = await read("lib/creem-billing.ts");
  assert.match(source, /test-api\.creem\.io/);
  assert.match(source, /api\.creem\.io/);
  assert.match(source, /\/v1\/checkouts/);
  assert.match(source, /product_id/);
  assert.match(source, /success_url/);
  assert.match(source, /metadata/);
  assert.match(source, /organizationId/);
  assert.match(source, /packageKey/);
  assert.match(source, /billingInterval/);
  assert.match(source, /\/v1\/customers\/billing/);
  assert.match(source, /customer_id/);
  assert.match(source, /customer_portal_link/);
  assert.match(source, /x-api-key/);
});

test("Creem lifecycle events without metadata resolve organization from Foremention billing_accounts", async () => {
  const webhook = await read("app/api/billing/webhook/route.ts");
  assert.match(webhook, /billing_accounts/);
  assert.match(webhook, /external_subscription_id/);
  assert.match(webhook, /external_customer_id/);
  assert.match(webhook, /provider=eq\./);
  assert.match(webhook, /resolveBillingOrganization/);
});

test("Creem environment is documented but live activation remains explicit and disabled by default", async () => {
  const env = await read(".env.example");
  for (const name of [
    "CREEM_ENVIRONMENT",
    "CREEM_API_KEY",
    "CREEM_WEBHOOK_SECRET",
    "CREEM_CORE_MONTHLY_PRODUCT_ID",
    "CREEM_CORE_ANNUAL_PRODUCT_ID",
    "CREEM_SIGNAL_MONTHLY_PRODUCT_ID",
    "CREEM_SIGNAL_ANNUAL_PRODUCT_ID",
    "CREEM_LIVE_ENABLED=0",
  ]) assert.match(env, new RegExp(name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
});
