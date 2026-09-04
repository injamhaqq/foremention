import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  verifyResendWebhookSignature,
  normalizeResendWebhookEvent,
} from "../lib/acquisition-resend-webhook.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

function signed(payload, timestamp = 1788522000) {
  const secretBytes = Buffer.from("foremention-resend-webhook-secret-32-bytes", "utf8");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const id = "msg_foremention_test_123456";
  const signature = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return { secret, headers: { id, timestamp: String(timestamp), signature: `v1,${signature}` } };
}

test("verifies raw Resend/Svix webhook signature and rejects tampering/replay age", async () => {
  const payload = JSON.stringify({ type: "email.sent", created_at: "2026-09-04T11:40:00.000Z", data: { email_id: "email-1" } });
  const auth = signed(payload);
  assert.equal(await verifyResendWebhookSignature(payload, auth.headers, auth.secret, 1788522000 * 1000), true);
  assert.equal(await verifyResendWebhookSignature(`${payload} `, auth.headers, auth.secret, 1788522000 * 1000), false);
  assert.equal(await verifyResendWebhookSignature(payload, auth.headers, auth.secret, (1788522000 + 301) * 1000), false);
});

test("normalizes only bounded email events with provider IDs", () => {
  const event = normalizeResendWebhookEvent({
    type: "email.sent",
    created_at: "2026-09-04T11:40:00.000Z",
    data: { email_id: "56761188-7520-42d8-8898-ff6fc54ce618", message_id: "<msg@example.com>" },
  });
  assert.deepEqual(event, {
    type: "email.sent",
    createdAt: "2026-09-04T11:40:00.000Z",
    emailId: "56761188-7520-42d8-8898-ff6fc54ce618",
    messageId: "<msg@example.com>",
  });
  assert.throws(() => normalizeResendWebhookEvent({ type: "contact.created", created_at: "2026-09-04T11:40:00Z", data: {} }), /ACQUISITION_RESEND_EVENT_UNSUPPORTED/);
});

test("runtime webhook stores svix id, correlates Message-ID, suppresses unsafe delivery outcomes and retrieves inbound reply content", async () => {
  const source = await text("lib/acquisition-resend-webhook-runtime.ts");
  assert.match(source, /acquisition_outreach_webhook_events/);
  assert.match(source, /provider_message_id/);
  assert.match(source, /email\.bounced/);
  assert.match(source, /email\.complained/);
  assert.match(source, /email\.received/);
  assert.match(source, /emails\/receiving/);
  assert.match(source, /recordAcquisitionReply/);
  assert.match(source, /suppressAcquisitionContact/);
});

test("runtime never regex-sanitizes or entity-decodes untrusted HTML replies", async () => {
  const source = await text("lib/acquisition-resend-webhook-runtime.ts");
  assert.match(source, /typeof email\.text === "string"/);
  assert.match(source, /email\.subject\.trim\(\)\.slice\(0, 500\)/);
  assert.doesNotMatch(source, /email\.html\s*\.replace/);
  assert.doesNotMatch(source, /replace\(\/<script/);
  assert.doesNotMatch(source, /replace\(\/&amp;/);
});

test("public webhook route verifies the raw body before parsing", async () => {
  const source = await text("app/api/acquisition/resend-webhook/route.ts");
  assert.match(source, /request\.text\(\)/);
  assert.match(source, /svix-id/);
  assert.match(source, /verifyResendWebhookSignature/);
  assert.doesNotMatch(source, /request\.json\(\)/);
});