import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResendAcquisitionRequest,
  getAcquisitionOutreachTransportStatus,
} from "../lib/acquisition-outreach-transport.ts";

const envSnapshot = { ...process.env };
const unsubscribeSecret = "u".repeat(40);
const webhookSecret = `whsec_${"A".repeat(44)}`;
const resetEnv = () => {
  for (const key of Object.keys(process.env)) if (!(key in envSnapshot)) delete process.env[key];
  Object.assign(process.env, envSnapshot);
};

test.afterEach(resetEnv);

test("transport fails closed until sending, deliverability, webhooks, sender, reply mailbox and unsubscribe config are all verified", () => {
  delete process.env.ACQUISITION_OUTREACH_SEND_ENABLED;
  delete process.env.ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED;
  delete process.env.ACQUISITION_OUTREACH_WEBHOOKS_VERIFIED;
  delete process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.ACQUISITION_OUTREACH_FROM_EMAIL;
  delete process.env.ACQUISITION_OUTREACH_REPLY_TO_EMAIL;
  assert.equal(getAcquisitionOutreachTransportStatus().available, false);

  Object.assign(process.env, {
    ACQUISITION_OUTREACH_SEND_ENABLED: "true",
    ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED: "true",
    ACQUISITION_OUTREACH_WEBHOOKS_VERIFIED: "true",
    ACQUISITION_OUTREACH_FROM_EMAIL: "Injam <outreach@foremention.com>",
    ACQUISITION_OUTREACH_REPLY_TO_EMAIL: "injam@foremention.com",
    RESEND_API_KEY: "test-provider-key",
    RESEND_WEBHOOK_SECRET: webhookSecret,
    NEXT_PUBLIC_SITE_URL: "https://foremention.com",
    EMAIL_UNSUBSCRIBE_SECRET: unsubscribeSecret,
  });
  assert.equal(getAcquisitionOutreachTransportStatus().available, true);
});

test("Resend request has deterministic idempotency and one-click unsubscribe headers", async () => {
  const request = await buildResendAcquisitionRequest({
    accountId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    draftId: "44444444-4444-4444-8444-444444444444",
    to: "buyer@example.com",
    subject: "Example: AI recommendation review",
    body: "Hi Sam,\n\nA source-backed message.\n\nTo opt out, reply unsubscribe.\n\nBest,\nInjam",
    from: "Injam <outreach@foremention.com>",
    replyTo: "injam@foremention.com",
    siteUrl: "https://foremention.com",
    unsubscribeSecret,
  });

  assert.equal(request.headers["Idempotency-Key"], "acquisition-send-44444444-4444-4444-8444-444444444444");
  assert.match(request.headers["List-Unsubscribe"], /^<https:\/\/foremention\.com\/api\/acquisition\/unsubscribe\?token=/);
  assert.equal(request.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(request.body.reply_to, "injam@foremention.com");
  assert.deepEqual(request.body.to, ["buyer@example.com"]);
});
