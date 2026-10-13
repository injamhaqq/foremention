import assert from "node:assert/strict";
import test from "node:test";
import { billingProvider, paddleLiveConfigured } from "../lib/billing-provider.ts";

const originalEnv = { ...process.env };
function live(overrides = {}) {
  for (const key of Object.keys(process.env)) if (key.startsWith("PADDLE_") || key === "BILLING_PROVIDER_ID") delete process.env[key];
  Object.assign(process.env, {
    NODE_ENV: "production",
    BILLING_PROVIDER_ID: "paddle",
    PADDLE_ENVIRONMENT: "live",
    PADDLE_LIVE_ENABLED: "1",
    PADDLE_API_KEY: "pdl_live_apikey_test_only",
    PADDLE_WEBHOOK_SECRET: "test_only_secret",
  }, overrides);
}
test.afterEach(() => { process.env = { ...originalEnv }; });

test("live adapter activates only with every owner gate and built-in live prices", () => {
  live();
  assert.equal(paddleLiveConfigured(), true);
  assert.equal(billingProvider()?.configured(), true);
  assert.equal(billingProvider()?.checkoutOffers().length, 2);
});

test("live adapter stays off without PADDLE_LIVE_ENABLED=1", () => {
  live({ PADDLE_LIVE_ENABLED: "0" });
  assert.equal(billingProvider()?.configured(), false);
});

test("live adapter refuses a sandbox key", () => {
  live({ PADDLE_API_KEY: "pdl_sdbx_apikey_test_only" });
  assert.equal(billingProvider()?.configured(), false);
});

test("live adapter needs the webhook secret", () => {
  live({ PADDLE_WEBHOOK_SECRET: "" });
  assert.equal(billingProvider()?.configured(), false);
});
