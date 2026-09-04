import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  acquisitionEnrollmentKey,
  buildAcquisitionOutreachSentEvent,
} from "../lib/acquisition-outreach-send.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const draftId = "11111111-1111-4111-8111-111111111111";

test("enrollment idempotency key is deterministic and provider scoped", () => {
  const first = acquisitionEnrollmentKey(draftId, "resend");
  const second = acquisitionEnrollmentKey(draftId, "resend");
  assert.equal(first, second);
  assert.match(first, /^acquisition-enrollment-resend-[a-f0-9]{16}$/);
  assert.notEqual(first, acquisitionEnrollmentKey(draftId, "outreach"));
});

test("confirmed send produces only contacted-stage evidence, never customer truth", () => {
  const event = buildAcquisitionOutreachSentEvent({
    accountId: "22222222-2222-4222-8222-222222222222",
    contactId: "33333333-3333-4333-8333-333333333333",
    externalReference: "resend-email-123",
    occurredAt: "2026-09-04T11:30:00.000Z",
  });
  assert.equal(event.event_type, "outreach_sent");
  assert.equal(event.source_system, "acquisition_outreach");
  assert.equal(event.external_reference, "resend-email-123");
  assert.doesNotMatch(JSON.stringify(event), /design_partner|customer|won|payment/i);
});

test("runtime send re-checks qualification, approval, verified route, suppression and transport before provider mutation", async () => {
  const source = await text("lib/acquisition-outreach-send.ts");
  assert.match(source, /acquisition_shadow_qualified_candidates/);
  assert.match(source, /acquisition_suppressions/);
  assert.match(source, /evaluateOutreachEligibility/);
  assert.match(source, /sendAcquisitionOutreachEmail/);
  assert.match(source, /acquisition_sequence_enrollments/);
  assert.match(source, /outreach_sent/);
  assert.match(source, /lifecycle_stage=in\.\(target,prospect,qualified\)/);
  assert.doesNotMatch(source, /design_partner|payment_verified|stage:\s*["']customer/);
});
