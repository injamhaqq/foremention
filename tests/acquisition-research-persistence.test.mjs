import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoveryPersistenceRecords,
  discoveryRunKey,
} from "../lib/acquisition-research-persistence.ts";

const candidate = {
  companyName: "Example, Inc.",
  domain: "example.com",
  canonicalCompanyKey: "domain-example.com",
  sourceUrl: "https://example.com/about",
  retrievedAt: "2026-09-04T08:00:00.000Z",
  providerId: "test-provider",
  providerRequestId: "req-123",
};

test("builds a deterministic bounded discovery run key", () => {
  const first = discoveryRunKey(candidate.canonicalCompanyKey, candidate.retrievedAt);
  const second = discoveryRunKey(candidate.canonicalCompanyKey, candidate.retrievedAt);
  assert.equal(first, second);
  assert.match(first, /^discovery-2026-09-04-[a-f0-9]{16}$/);
  assert.ok(first.length <= 200);
});

test("builds shadow-only persistence records without lifecycle promotion", () => {
  const records = buildDiscoveryPersistenceRecords(candidate);

  assert.deepEqual(records.account, {
    company_name: "Example, Inc.",
    domain: "example.com",
    lead_source: "autopilot_public_discovery",
    channel: "research",
  });
  assert.equal(records.run.canonical_company_key, "domain-example.com");
  assert.equal(records.run.qualification_score, 0);
  assert.equal(records.run.qualified_shadow, false);
  assert.equal(records.run.why_now, null);
  assert.deepEqual(records.run.disqualifiers, []);
  assert.deepEqual(records.run.score_breakdown, {});
  assert.equal(records.evidence.source_url, "https://example.com/about");
  assert.equal(records.evidence.evidence_key, "discovery_source");
  assert.equal(records.evidence.confidence, 100);

  const serialized = JSON.stringify(records);
  for (const forbidden of ["design_partner", "customer", "contacted", "conversation", "outreach_sent", "email"]) {
    assert.equal(serialized.includes(forbidden), false, `unexpected lifecycle/outreach mutation: ${forbidden}`);
  }
});

test("rejects a candidate whose canonical identity does not match the persisted schema", () => {
  assert.throws(
    () => buildDiscoveryPersistenceRecords({ ...candidate, canonicalCompanyKey: "domain:example.com" }),
    /ACQUISITION_PERSISTENCE_INVALID_COMPANY_KEY/,
  );
});
