import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("payment URL is non-indexed and production checkout fails closed", () => {
  const page = source("app/pay/page.tsx");
  assert.ok(page.includes('path: "/pay"'));
  assert.ok(page.includes("noIndex: true"));
  assert.ok(page.includes('dynamic = "force-dynamic"'));
  assert.ok(page.includes('process.env.NODE_ENV !== "production"'));
  assert.ok(page.includes('PADDLE_ENVIRONMENT === "sandbox"'));
  assert.ok(page.includes("PADDLE_SANDBOX_ADAPTER_ENABLED"));
  assert.ok(page.includes("billingProviderConfigured()"));
  assert.ok(page.includes("PADDLE_SANDBOX_CLIENT_TOKEN"));
  assert.ok(page.includes("Online checkout is not yet available"));
});
test("sandbox link initializes Paddle.js without duplicate Checkout.open", () => {
  const client = source("components/paddle-sandbox-payment.tsx");
  for(const value of ["use client", "https://cdn.paddle.com/paddle/v2/paddle.js", 'get("_ptxn")', 'Environment.set("sandbox")', "paddle.Initialize", "started.current = true", 'role="status"']) {
    assert.ok(client.includes(value), value);
  }
  assert.ok(client.includes("TXN_ID"));
  assert.ok(!client.includes("paddle.Checkout.open("));
  assert.ok(!client.includes("PADDLE_API_KEY"));
  assert.ok(!client.includes("PADDLE_WEBHOOK_SECRET"));
});
test("sandbox environment documents only the browser-safe test token", () => {
  const env = source(".env.example");
  assert.ok(env.includes("PADDLE_SANDBOX_CLIENT_TOKEN="));
  assert.ok(env.includes("PADDLE_LIVE_ENABLED=0"));
});
