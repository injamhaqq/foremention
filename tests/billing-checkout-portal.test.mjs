import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const original = { ...process.env };
const root = new URL("../", import.meta.url);

function restoreEnv() {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
}

test.afterEach(restoreEnv);

test("Stripe billing stays fail-closed until provider, secret, webhook secret, and a package price exist", async () => {
  const billing = await import("../lib/stripe-billing.ts");
  delete process.env.BILLING_PROVIDER_ID;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_CORE_PRICE_ID;
  delete process.env.STRIPE_SIGNAL_PRICE_ID;
  assert.equal(billing.stripeBillingConfigured(), false);
  process.env.BILLING_PROVIDER_ID = "stripe";
  process.env.STRIPE_SECRET_KEY = "sk_test_example";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
  process.env.STRIPE_CORE_PRICE_ID = "price_core";
  assert.equal(billing.stripeBillingConfigured(), true);
  assert.equal(billing.stripePriceIdFor("core"), "price_core");
  assert.equal(billing.stripePriceIdFor("intelligence"), null);
});

test("Stripe webhook verification accepts a current v1 signature and rejects replay", async () => {
  const { verifyStripeWebhook } = await import("../lib/stripe-billing.ts");
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  const now = new Date("2026-08-29T16:00:00.000Z");
  const timestamp = Math.floor(now.getTime() / 1000);
  const body = JSON.stringify({ id: "evt_123", type: "customer.subscription.updated" });
  const signature = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");
  assert.equal(await verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`, now), true);
  await assert.rejects(() => verifyStripeWebhook(body, `t=${timestamp - 1000},v1=${signature}`, now), /timestamp/i);
});

test("Stripe subscription events map into the existing verified billing event model", async () => {
  const { parseStripeBillingEvent } = await import("../lib/stripe-billing.ts");
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const raw = JSON.stringify({
    id: "evt_subscription",
    type: "customer.subscription.updated",
    data: { object: {
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      metadata: { organizationId, packageKey: "signal" },
    } },
  });
  assert.deepEqual(parseStripeBillingEvent(raw), {
    organizationId,
    packageKey: "signal",
    state: "active",
    externalCustomerId: "cus_123",
    externalSubscriptionId: "sub_123",
    eventId: "evt_subscription",
  });
  assert.equal(parseStripeBillingEvent(JSON.stringify({ id: "evt_other", type: "customer.created", data: { object: {} } })), null);
});

test("checkout and portal routes derive workspace/customer identity server-side", async () => {
  const [checkout, portal] = await Promise.all([
    readFile(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/portal/route.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [checkout, portal]) {
    assert.match(source, /requireViewer/);
    assert.match(source, /getPrimaryWorkspaceRole/);
    assert.match(source, /loadWorkspaceContext/);
    assert.match(source, /isTrustedMutationOrigin/);
    assert.doesNotMatch(source, /body\.organizationId|body\.customerId/);
  }
  assert.match(checkout, /createStripeCheckoutSession/);
  assert.match(portal, /createStripePortalSession/);
});
