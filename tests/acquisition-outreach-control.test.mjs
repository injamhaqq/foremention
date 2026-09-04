import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEvidenceGroundedOutreachDraft,
  classifyAcquisitionReply,
  evaluateOutreachEligibility,
  outreachDraftKey,
  outreachEnrollmentKey,
  replySuppressionPolicy,
} from "../lib/acquisition-outreach.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260904000200_acquisition_outreach_control.sql";

test("outreach schema adds verified contact routes and service-only control tables", async () => {
  const migration = await text(migrationPath);

  assert.match(migration, /alter table public\.commercial_contacts[\s\S]*contact_route_status/i);
  assert.match(migration, /contact_source_url/i);
  assert.match(migration, /contact_verified_at/i);
  for (const table of [
    "acquisition_outreach_drafts",
    "acquisition_suppressions",
    "acquisition_sequence_enrollments",
    "acquisition_reply_events",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /grant select, insert, update, delete[\s\S]*to service_role/i);
  assert.match(migration, /draft_key text not null unique/i);
  assert.match(migration, /idempotency_key text not null unique/i);
  assert.match(migration, /classification in \('positive','referral','question','objection','timing','not_relevant','unsubscribe','bounce'\)/i);
});

test("draft construction uses only a traceable recent-trigger fact", () => {
  const draft = buildEvidenceGroundedOutreachDraft({
    accountId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    researchRunId: "33333333-3333-4333-8333-333333333333",
    companyName: "Example",
    contactFirstName: "Sam",
    contactRole: "VP Marketing",
    facts: [
      {
        key: "recent_trigger",
        value: "Example launched an AI-search initiative this quarter",
        sourceUrl: "https://example.com/blog/ai-search",
        retrievedAt: "2026-09-04T10:00:00.000Z",
        confidence: 95,
      },
    ],
  });

  assert.equal(draft.claimSources.length, 1);
  assert.equal(draft.claimSources[0].sourceUrl, "https://example.com/blog/ai-search");
  assert.match(draft.body, /Example launched an AI-search initiative this quarter/);
  assert.doesNotMatch(draft.body, /guarantee|ROI|we know|customer/i);
  assert.equal(draft.draftKey, outreachDraftKey(draft.accountId, draft.contactId, draft.researchRunId));
});

test("draft construction fails closed without a traceable why-now fact", () => {
  assert.throws(
    () => buildEvidenceGroundedOutreachDraft({
      accountId: "11111111-1111-4111-8111-111111111111",
      contactId: "22222222-2222-4222-8222-222222222222",
      researchRunId: "33333333-3333-4333-8333-333333333333",
      companyName: "Example",
      contactFirstName: null,
      contactRole: "VP Marketing",
      facts: [],
    }),
    /ACQUISITION_OUTREACH_TRACEABLE_TRIGGER_REQUIRED/,
  );
});

test("send eligibility requires qualification, verified contact route, approval, transport and no suppression", () => {
  const eligible = evaluateOutreachEligibility({
    qualifiedShadow: true,
    contactRouteStatus: "verified",
    draftStatus: "approved",
    transportAvailable: true,
    suppressed: false,
  });
  assert.deepEqual(eligible, { eligible: true, reason: "ELIGIBLE" });

  for (const blocked of [
    { qualifiedShadow: false, contactRouteStatus: "verified", draftStatus: "approved", transportAvailable: true, suppressed: false },
    { qualifiedShadow: true, contactRouteStatus: "unverified", draftStatus: "approved", transportAvailable: true, suppressed: false },
    { qualifiedShadow: true, contactRouteStatus: "verified", draftStatus: "draft", transportAvailable: true, suppressed: false },
    { qualifiedShadow: true, contactRouteStatus: "verified", draftStatus: "approved", transportAvailable: false, suppressed: false },
    { qualifiedShadow: true, contactRouteStatus: "verified", draftStatus: "approved", transportAvailable: true, suppressed: true },
  ]) {
    assert.equal(evaluateOutreachEligibility(blocked).eligible, false);
  }
});

test("reply classification prioritizes unsubscribe and bounce stop signals", () => {
  assert.equal(classifyAcquisitionReply("Please unsubscribe me from future emails."), "unsubscribe");
  assert.equal(classifyAcquisitionReply("550 mailbox unavailable", { providerEvent: "bounce" }), "bounce");
  assert.equal(classifyAcquisitionReply("Not interested, please don't contact me again."), "not_relevant");
  assert.equal(classifyAcquisitionReply("Can you send more details?"), "question");
  assert.equal(classifyAcquisitionReply("Yes, this is interesting. Let's talk."), "positive");
});

test("any real reply stops automated follow-up while permanent negative signals remain suppressed", () => {
  assert.deepEqual(replySuppressionPolicy("positive"), { stopSequence: true, suppress: true, reason: "reply_received" });
  assert.deepEqual(replySuppressionPolicy("question"), { stopSequence: true, suppress: true, reason: "reply_received" });
  assert.deepEqual(replySuppressionPolicy("unsubscribe"), { stopSequence: true, suppress: true, reason: "unsubscribe" });
  assert.deepEqual(replySuppressionPolicy("bounce"), { stopSequence: true, suppress: true, reason: "bounce" });
  assert.deepEqual(replySuppressionPolicy("not_relevant"), { stopSequence: true, suppress: true, reason: "negative_intent" });
});

test("sequence enrollment idempotency key is deterministic per provider, contact, draft and sequence", () => {
  const first = outreachEnrollmentKey({
    provider: "outreach",
    contactId: "22222222-2222-4222-8222-222222222222",
    draftId: "44444444-4444-4444-8444-444444444444",
    sequenceId: "design-partner-v1",
  });
  const second = outreachEnrollmentKey({
    provider: "outreach",
    contactId: "22222222-2222-4222-8222-222222222222",
    draftId: "44444444-4444-4444-8444-444444444444",
    sequenceId: "design-partner-v1",
  });
  assert.equal(first, second);
  assert.match(first, /^outreach-enroll-[a-f0-9]{16}$/);
});
