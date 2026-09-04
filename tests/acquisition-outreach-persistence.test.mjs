import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildOutreachDraftRecord,
  buildReplyPersistencePlan,
  buildVerifiedContactRoutePatch,
} from "../lib/acquisition-outreach-persistence.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("verified contact route requires a public HTTPS source and bounded email", () => {
  const patch = buildVerifiedContactRoutePatch({
    email: "Buyer@Example.com",
    sourceUrl: "https://example.com/team#marketing",
    verifiedAt: "2026-09-04T11:00:00.000Z",
  });
  assert.deepEqual(patch, {
    email: "buyer@example.com",
    contact_route_status: "verified",
    contact_source_url: "https://example.com/team",
    contact_verified_at: "2026-09-04T11:00:00.000Z",
  });
  assert.throws(
    () => buildVerifiedContactRoutePatch({ email: "buyer@example.com", sourceUrl: "http://example.com", verifiedAt: "2026-09-04T11:00:00.000Z" }),
    /ACQUISITION_CONTACT_SOURCE_REQUIRED/,
  );
});

test("draft persistence starts in draft status and preserves traceable claim sources", () => {
  const record = buildOutreachDraftRecord({
    accountId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    researchRunId: "33333333-3333-4333-8333-333333333333",
    draftKey: "outreach-draft-1234567890abcdef",
    subject: "Example: AI recommendation review",
    body: "Hi Sam,\n\nPublic signal.\n\nBest,\nInjam",
    claimSources: [{ claim: "Public signal", sourceUrl: "https://example.com/news", retrievedAt: "2026-09-04T10:00:00.000Z", confidence: 90 }],
  });
  assert.equal(record.status, "draft");
  assert.equal(record.approved_at, undefined);
  assert.equal(record.sent_at, undefined);
  assert.equal(record.claim_sources[0].sourceUrl, "https://example.com/news");
});

test("reply persistence plan always stops sequence and suppresses future automation without lifecycle promotion", () => {
  const plan = buildReplyPersistencePlan({
    classification: "positive",
    accountId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    externalReference: "gmail-message-123",
    receivedAt: "2026-09-04T11:10:00.000Z",
    evidenceExcerpt: "Yes, this is interesting. Let's talk.",
  });
  assert.equal(plan.suppression.reason, "reply_received");
  assert.equal(plan.suppression.active, true);
  assert.equal(plan.stopEnrollments.status, "stopped");
  assert.equal(plan.commercialEvent.event_type, "reply_received");
  assert.equal(plan.commercialEvent.outcome, "positive");

  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /design_partner|customer|won|payment_verified/);
});

test("outreach persistence source never sends email or promotes lifecycle truth", async () => {
  const source = await text("lib/acquisition-outreach-persistence.ts");
  assert.doesNotMatch(source, /sendProductAlertEmail|api\.resend\.com|sendEmail/i);
  assert.doesNotMatch(source, /lifecycle_stage[\s\S]*design_partner|lifecycle_stage[\s\S]*customer/i);
});
