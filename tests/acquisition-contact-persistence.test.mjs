import assert from "node:assert/strict";
import test from "node:test";
import {
  acquisitionContactKey,
  buildAcquisitionContactRecord,
} from "../lib/acquisition-contact-persistence.ts";

const candidate = {
  fullName: "Sam Rivera",
  jobTitle: "VP Marketing",
  email: "sam@example.com",
  sourceUrl: "https://example.com/team",
  retrievedAt: "2026-09-04T11:00:00.000Z",
  confidence: 94,
  buyerRole: "economic_buyer",
};

const accountId = "11111111-1111-4111-8111-111111111111";

test("acquisition contact key is deterministic and account scoped", () => {
  const first = acquisitionContactKey(accountId, "SAM@EXAMPLE.COM");
  const second = acquisitionContactKey(accountId, "sam@example.com");
  assert.equal(first, second);
  assert.match(first, /^acq-contact-[a-f0-9]{16}$/);
  assert.notEqual(first, acquisitionContactKey("22222222-2222-4222-8222-222222222222", "sam@example.com"));
});

test("resolved public contact becomes a verified schema-compatible route", () => {
  const record = buildAcquisitionContactRecord(accountId, candidate);
  assert.equal(record.account_id, accountId);
  assert.equal(record.email, "sam@example.com");
  assert.equal(record.buyer_role, "economic_buyer");
  assert.equal(record.contact_route_status, "verified");
  assert.equal(record.contact_source_url, "https://example.com/team");
  assert.equal(record.contact_verified_at, candidate.retrievedAt);
  assert.equal(record.source, "autopilot_public_business_source");
  assert.match(record.acquisition_contact_key, /^acq-contact-[a-f0-9]{16}$/);
});

test("contact persistence rejects malformed identity or non-HTTPS provenance", () => {
  assert.throws(() => acquisitionContactKey("bad-account", candidate.email), /ACQUISITION_CONTACT_ACCOUNT_INVALID/);
  assert.throws(
    () => buildAcquisitionContactRecord(accountId, { ...candidate, sourceUrl: "http://example.com/team" }),
    /ACQUISITION_CONTACT_SOURCE_INVALID/,
  );
});
