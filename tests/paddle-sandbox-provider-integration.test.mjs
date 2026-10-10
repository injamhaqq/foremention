import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { billingProvider, billingProviderId } from "../lib/billing-provider.ts";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const orgId = "11111111-1111-4111-8111-111111111111";
const priceId = "pri_" + "a".repeat(26);
const customerId = "ctm_" + "b".repeat(26);
const transactionId = "txn_" + "c".repeat(26);

function configure() {
  process.env.BILLING_PROVIDER_ID = "paddle";
  process.env.PADDLE_ENVIRONMENT = "sandbox";
  process.env.PADDLE_SANDBOX_ADAPTER_ENABLED = "1";
  process.env.PADDLE_API_KEY = "test_only_paddle";
  process.env.PADDLE_WEBHOOK_SECRET = "test_only_secret";
  process.env.PADDLE_CORE_MONTHLY_PRICE_ID = priceId;
  process.env.NODE_ENV = "test";
}

test.afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  globalThis.fetch = originalFetch;
});

test("Paddle provider is an explicit sandbox-only adapter with no production activation", () => {
  configure();
  assert.equal(billingProviderId(), "paddle");
  assert.equal(billingProvider()?.configured(), true);
  assert.deepEqual(billingProvider()?.checkoutOffers(), [{ packageKey: "core", billingInterval: "monthly" }]);
  delete process.env.PADDLE_SANDBOX_ADAPTER_ENABLED;
  assert.equal(billingProvider()?.configured(), false);
  process.env.PADDLE_SANDBOX_ADAPTER_ENABLED = "1";
  process.env.NODE_ENV = "production";
  assert.equal(billingProvider()?.configured(), false);
  process.env.PADDLE_ENVIRONMENT = "live";
  process.env.PADDLE_LIVE_ENABLED = "1";
  assert.equal(billingProvider()?.configured(), false);
  process.env.NODE_ENV = "test";
  assert.equal(billingProvider()?.configured(), false);
});

test("existing Stripe/Creem provider choices are preserved", () => {
  process.env.BILLING_PROVIDER_ID = "stripe";
  assert.equal(billingProviderId(), "stripe");
  assert.equal(billingProvider()?.id, "stripe");
  process.env.BILLING_PROVIDER_ID = "creem";
  assert.equal(billingProviderId(), "creem");
  assert.equal(billingProvider()?.id, "creem");
  process.env.BILLING_PROVIDER_ID = "unexpected";
  assert.equal(billingProviderId(), null);
  assert.equal(billingProvider(), null);
});

test("Paddle adapter creates a sandbox-only hosted transaction using server product and organization", async () => {
  configure();
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://sandbox-api.paddle.com/transactions");
    assert.equal(options.method, "POST");
    const data = JSON.parse(options.body);
    assert.equal(data.collection_mode, "automatic");
    assert.deepEqual(data.items, [{ price_id: priceId, quantity: 1 }]);
    assert.equal(data.custom_data.organizationId, orgId);
    assert.equal(data.custom_data.packageKey, "core");
    assert.equal(data.custom_data.billingInterval, "monthly");
    assert.equal(data.customer_id, undefined);
    return new Response(JSON.stringify({
      data: { id: transactionId, checkout: { url: "https://foremention.com/pay?_ptxn=" + transactionId } },
    }), { status: 201 });
  };
  const provider = billingProvider();
  const result = await provider.createCheckout({
    organizationId: orgId, packageKey: "core", billingInterval: "monthly",
    customerEmail: "buyer@example.com", successUrl: "https://foremention.com/app/settings",
    cancelUrl: "https://foremention.com/app/settings",
  });
  assert.equal(result.id, transactionId);
  delete process.env.PADDLE_SANDBOX_ADAPTER_ENABLED;
  await assert.rejects(
    () => provider.createCheckout({
      organizationId: orgId, packageKey: "core", billingInterval: "monthly",
      customerEmail: "buyer@example.com", successUrl: "https://foremention.com/app/settings",
      cancelUrl: "https://foremention.com/app/settings",
    }),
    /sandbox adapter/i,
  );
});

test("Paddle portal requires sandbox gate and verified customer identity", async () => {
  configure();
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://sandbox-api.paddle.com/customers/" + customerId + "/portal-sessions");
    return new Response(JSON.stringify({ data: { urls: { general: { overview: "https://customer-portal.paddle.com/sandbox" } } } }), { status: 201 });
  };
  assert.equal((await billingProvider().createPortal({ customerId, returnUrl: "https://foremention.com" })).url, "https://customer-portal.paddle.com/sandbox");
  await assert.rejects(
    () => billingProvider().createPortal({ customerId: "cust_untrusted", returnUrl: "https://foremention.com" }),
    /customer/i,
  );
});

test("Paddle provider verifies signed raw body and does not acknowledge adjustments without persistence", async () => {
  configure();
  const provider = billingProvider();
  const now = new Date();
  const ts = String(Math.floor(now.getTime() / 1000));
  const body = JSON.stringify({ event_type: "subscription.created", data: {} });
  const signature = crypto.createHmac("sha256", "test_only_secret").update(ts + ":" + body).digest("hex");
  assert.equal(await provider.verifyWebhook(body, new Headers({ "paddle-signature": "ts=" + ts + ";h1=" + signature })), true);
  await assert.rejects(
    () => provider.verifyWebhook(body, new Headers({ "paddle-signature": "ts=" + ts + ";h1=" + "0".repeat(64) })),
    /signature/i,
  );
  const adjustment = JSON.stringify({
    event_type: "adjustment.created", event_id: "evt_" + "d".repeat(26),
    occurred_at: "2026-10-10T00:00:00.000Z",
    data: {
      id: "adj_" + "e".repeat(26), action: "refund",
      status: "approved", type: "partial",
      transaction_id: transactionId, customer_id: customerId,
      subscription_id: null,
    },
  });
  assert.throws(() => provider.parseWebhook(adjustment), /durable audit/i);
});

test("billing portal does not treat database identity read outage as no customer", async () => {
  const source = await readFile(new URL("../app/api/billing/portal/route.ts", import.meta.url), "utf8");
  assert.match(source, /Billing portal ownership could not be verified/);
  assert.doesNotMatch(source, /\.catch\(\(\) => \[\]\)/);
});

test("main billing routes continue using the provider-neutral selector", async () => {
  for (const name of ["checkout", "portal", "status", "webhook"]) {
    const file = await readFile(new URL("../app/api/billing/" + name + "/route.ts", import.meta.url), "utf8");
    assert.match(file, /billing-provider/);
    assert.doesNotMatch(file, /@\/lib\/paddle-billing/);
  }
});
