import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  paddleSandboxRequestAllowed,
  paddleSandboxRuntimeAllowed,
  paddleSandboxStagingHost,
} from "../lib/paddle-sandbox-staging.ts";
import { billingProvider } from "../lib/billing-provider.ts";
import { paddleCandidateConfigured } from "../lib/paddle-billing.ts";

const originalEnv = { ...process.env };
const STAGING = "fm-sandbox-staging.trycloudflare.com";
const SANDBOX_KEY = "pdl_sdbx_apikey_" + "a".repeat(26) + "_" + "B".repeat(22) + "_xyz";
const LIVE_KEY = "pdl_live_apikey_" + "a".repeat(26) + "_" + "B".repeat(22) + "_xyz";

function stagingEnv(overrides = {}) {
  Object.assign(process.env, {
    NODE_ENV: "production",
    BILLING_PROVIDER_ID: "paddle",
    PADDLE_ENVIRONMENT: "sandbox",
    PADDLE_SANDBOX_ADAPTER_ENABLED: "1",
    PADDLE_LIVE_ENABLED: "0",
    PADDLE_API_KEY: SANDBOX_KEY,
    PADDLE_WEBHOOK_SECRET: "test_only_secret",
    PADDLE_CORE_MONTHLY_PRICE_ID: "pri_" + "a".repeat(26),
    PADDLE_SANDBOX_STAGING_HOST: STAGING,
    NEXT_PUBLIC_SITE_URL: "https://" + STAGING,
  }, overrides);
}

test.afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("production build opens Paddle sandbox ONLY on the configured isolated staging host", () => {
  stagingEnv();
  assert.equal(paddleSandboxStagingHost(), STAGING);
  assert.equal(paddleSandboxRuntimeAllowed(), true);
  assert.equal(paddleSandboxRequestAllowed(STAGING), true);
  assert.equal(paddleSandboxRequestAllowed(STAGING + ":443"), true);
  assert.equal(paddleCandidateConfigured(), true);
  assert.equal(billingProvider()?.configured(), true);
  // Any other request host (including production) is refused on /pay.
  assert.equal(paddleSandboxRequestAllowed("foremention.com"), false);
  assert.equal(paddleSandboxRequestAllowed("www.foremention.com"), false);
  assert.equal(paddleSandboxRequestAllowed("evil.example"), false);
  assert.equal(paddleSandboxRequestAllowed(null), false);
});

test("production foremention.com can never be designated as the sandbox staging host", () => {
  for (const host of ["foremention.com", "www.foremention.com", "staging.foremention.com"]) {
    stagingEnv({ PADDLE_SANDBOX_STAGING_HOST: host, NEXT_PUBLIC_SITE_URL: "https://" + host });
    assert.equal(paddleSandboxStagingHost(), null, host);
    assert.equal(paddleSandboxRuntimeAllowed(), false, host);
    assert.equal(paddleSandboxRequestAllowed(host), false, host);
    assert.equal(billingProvider()?.configured(), false, host);
  }
});

test("staging gate fails closed without the staging host or with a mismatched site origin", () => {
  stagingEnv({ PADDLE_SANDBOX_STAGING_HOST: "" });
  assert.equal(paddleSandboxRuntimeAllowed(), false);
  assert.equal(billingProvider()?.configured(), false);
  stagingEnv({ NEXT_PUBLIC_SITE_URL: "https://foremention.com" });
  assert.equal(paddleSandboxRuntimeAllowed(), false);
  stagingEnv({ NEXT_PUBLIC_SITE_URL: "http://" + STAGING });
  assert.equal(paddleSandboxRuntimeAllowed(), false);
  stagingEnv({ PADDLE_SANDBOX_STAGING_HOST: "not a host" });
  assert.equal(paddleSandboxRuntimeAllowed(), false);
});

test("Paddle Live stays fail-closed: live env, live flag or live key close the gate", () => {
  stagingEnv({ PADDLE_ENVIRONMENT: "live", PADDLE_LIVE_ENABLED: "1" });
  assert.equal(paddleSandboxStagingHost(), null);
  assert.equal(billingProvider()?.configured(), false);
  stagingEnv({ PADDLE_LIVE_ENABLED: "1" });
  assert.equal(paddleSandboxStagingHost(), null);
  assert.equal(billingProvider()?.configured(), false);
  stagingEnv({ PADDLE_API_KEY: LIVE_KEY });
  assert.equal(paddleSandboxStagingHost(), null);
  assert.equal(billingProvider()?.configured(), false);
  stagingEnv({ PADDLE_SANDBOX_ADAPTER_ENABLED: "0" });
  assert.equal(paddleSandboxStagingHost(), null);
  assert.equal(billingProvider()?.configured(), false);
});

test("non-production runtimes keep the previous local sandbox behavior", () => {
  stagingEnv({ NODE_ENV: "test", PADDLE_SANDBOX_STAGING_HOST: "" });
  assert.equal(paddleSandboxRuntimeAllowed(), true);
  assert.equal(paddleSandboxRequestAllowed("localhost:3000"), true);
});

test("/pay CSP allows only Paddle SANDBOX checkout origins, and only on /pay", () => {
  const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /url\.pathname === "\/pay" \? paddleSandboxPayContentSecurityPolicy : contentSecurityPolicy/);
  assert.match(worker, /frame-src 'self' https:\/\/sandbox-buy\.paddle\.com/);
  // Live checkout frame origin must not be allowed anywhere in the policy.
  assert.doesNotMatch(worker, /(^|[\s'"])https:\/\/buy\.paddle\.com/m, "Live checkout frame must not be allowed");
  const page = readFileSync(new URL("../app/pay/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("paddleSandboxRequestAllowed(requestHost)"));
});

test("checkout fails closed with 503 when workspace authorization cannot be read (DB outage)", () => {
  const route = readFileSync(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8");
  const guard = route.indexOf("Workspace authorization could not be verified.");
  assert.ok(guard > 0);
  assert.ok(guard < route.indexOf("rpc/reserve_paddle_checkout"), "authorization outage must stop before any reservation or provider call");
  assert.match(route, /status: 503 \}\);\n  \}\n  if \(role !== "owner"\)/);
});
