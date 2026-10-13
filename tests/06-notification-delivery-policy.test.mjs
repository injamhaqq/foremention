import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ApplicationEmailSendUncertainError, sendProductAlertEmail } from "../lib/application-email.ts";
import { approvedWorkspaceAlertUrl, workspaceAlertIdempotencyKey } from "../lib/jobs/notification-delivery-policy.mjs";

const origin = "https://foremention.com";

test("workspace alerts keep permitted app routes on the configured origin", () => {
  assert.equal(approvedWorkspaceAlertUrl("/app/runs/abc?tab=source", origin), "https://foremention.com/app/runs/abc?tab=source");
  assert.equal(approvedWorkspaceAlertUrl("/app/analytics", origin), "https://foremention.com/app/analytics");
  assert.equal(approvedWorkspaceAlertUrl("/app", "http://localhost:3000"), "http://localhost:3000/app");
});

test("reject redirect, scheme, normalization, backslash, and deceptive app prefixes", () => {
  for (const href of ["https://evil.example/app", "//evil.example/app", "/app.evil", "/app/../../login", "/app/%2e%2e/login", "/app\\@evil.example", "/app\n.evil", "/unsubscribe", " /app"]) {
    assert.throws(() => approvedWorkspaceAlertUrl(href, origin), { name: "Error" }, href);
  }
  assert.throws(() => approvedWorkspaceAlertUrl("/app", "http://foremention.com"));
  assert.throws(() => approvedWorkspaceAlertUrl("/app", "https://user:password@foremention.com"));
});

test("delivery UUID produces one stable provider idempotency key", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(workspaceAlertIdempotencyKey(id), "foremention-alert:" + id);
  assert.equal(workspaceAlertIdempotencyKey(id.toUpperCase()), workspaceAlertIdempotencyKey(id));
  assert.throws(() => workspaceAlertIdempotencyKey("invalid"));
});

test("provider accepts idempotency header; 5xx and network outcomes remain uncertain", async () => {
  const priorFetch = globalThis.fetch;
  const priorApiKey = process.env.RESEND_API_KEY;
  const priorFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "synthetic-test-key-not-for-network";
  process.env.RESEND_FROM_EMAIL = "test@example.invalid";
  try {
    let headers;
    globalThis.fetch = async (_url, options) => {
      headers = options.headers;
      return { ok: true, json: async () => ({ id: "email-synthetic" }) };
    };
    const sent = await sendProductAlertEmail({
      to: "recipient@example.invalid", subject: "Synthetic check",
      text: "No network requests may escape this test.",
      idempotencyKey: "foremention-alert:synthetic",
    });
    assert.equal(sent.id, "email-synthetic");
    assert.equal(headers["Idempotency-Key"], "foremention-alert:synthetic");

    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => sendProductAlertEmail({ to: "recipient@example.invalid", subject: "Check", text: "Test" }), ApplicationEmailSendUncertainError);

    globalThis.fetch = async () => { throw new Error("Synthetic network interruption"); };
    await assert.rejects(() => sendProductAlertEmail({ to: "recipient@example.invalid", subject: "Check", text: "Test" }), ApplicationEmailSendUncertainError);

    globalThis.fetch = async () => ({ ok: false, status: 400 });
    await assert.rejects(() => sendProductAlertEmail({ to: "recipient@example.invalid", subject: "Check", text: "Test" }), /status 400/);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = priorApiKey;
    if (priorFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = priorFrom;
  }
});

test("alert sender preserves the uncertain receipt for manual reconciliation", async () => {
  const sender = await readFile(new URL("../lib/workspace-email-alerts.ts", import.meta.url), "utf8");
  assert.match(sender, /approvedWorkspaceAlertUrl\(input\.href, siteUrl\)/);
  assert.match(sender, /workspaceAlertIdempotencyKey\(delivery\.id\)/);
  assert.match(sender, /ApplicationEmailSendUncertainError/);
  assert.match(sender, /status: uncertain \? "pending" : "failed"/);
  assert.match(sender, /delivery_outcome_uncertain/);
  assert.match(sender, /status: "duplicate"/);
});
