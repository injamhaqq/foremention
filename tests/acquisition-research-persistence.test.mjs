import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoveryPersistenceRecords,
  buildResearchAssessmentPersistenceRecords,
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

test("builds research update + source facts without mutating commercial lifecycle truth", () => {
  const assessment = {
    facts: [
      {
        key: "recent_trigger",
        value: "Launched an AI-search initiative",
        sourceUrl: "https://example.com/blog/ai-search",
        retrievedAt: "2026-09-04T10:00:00.000Z",
        confidence: 95,
      },
      {
        key: "buyer_role",
        value: "VP Marketing",
        sourceUrl: "https://news.example.org/example",
        retrievedAt: "2026-09-04T10:00:00.000Z",
        confidence: 90,
      },
    ],
    sourceCount: 2,
    scores: {
      buyerQuestionCommercialFit: 20,
      competitiveDensity: 15,
      interventionCapability: 15,
      aiDiscoveryUrgency: 15,
      evidenceSensitivity: 10,
      measurementFit: 10,
      budgetAuthorityPath: 10,
      thirtyDayActionability: 5,
    },
    disqualifiers: [],
    qualification: {
      score: 100,
      qualified: true,
      threshold: 75,
      reasonCodes: ["SCORE_THRESHOLD_MET", "PUBLIC_EVIDENCE_PRESENT", "WHY_NOW_PRESENT"],
      whyNow: "Launched an AI-search initiative",
      sourceCount: 2,
    },
  };

  const records = buildResearchAssessmentPersistenceRecords(assessment);
  assert.equal(records.runPatch.qualification_score, 100);
  assert.equal(records.runPatch.qualified_shadow, true);
  assert.equal(records.runPatch.why_now, "Launched an AI-search initiative");
  assert.equal(records.evidence.length, 2);
  assert.equal(records.evidence[0].evidence_key, "buyer_role");
  assert.equal(records.evidence[1].evidence_key, "recent_trigger");

  const serialized = JSON.stringify(records);
  for (const forbidden of ["design_partner", "customer", "contacted", "conversation", "outreach_sent"]) {
    assert.equal(serialized.includes(forbidden), false, `unexpected lifecycle mutation: ${forbidden}`);
  }
});

test("rejects a candidate whose canonical identity does not match the persisted schema", () => {
  assert.throws(
    () => buildDiscoveryPersistenceRecords({ ...candidate, canonicalCompanyKey: "domain:example.com" }),
    /ACQUISITION_PERSISTENCE_INVALID_COMPANY_KEY/,
  );
});
