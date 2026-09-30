import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessCeoCommercialQualificationEvidence } from "../lib/ceo-commercial-qualification-evidence.ts";

const now = "2026-09-30T06:30:00.000Z";
const accountId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const runId = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contactId = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actorId = "30000000-0000-4000-8000-000000000001";

function researchFixture(count = 7) {
  const accounts = Array.from({ length: count }, (_, i) => ({ id: accountId(i + 1) }));
  const researchRuns = accounts.map((account, i) => ({
    id: runId(i + 1),
    account_id: account.id,
    qualification_score: 85,
    why_now: "Public launch evidence",
    disqualifiers: [],
    qualified_shadow: true,
    completed_at: "2026-09-25T12:00:00.000Z",
  }));
  const researchEvidence = researchRuns.map((run, i) => ({
    research_run_id: run.id,
    source_url: `https://example.com/company-${i + 1}`,
    retrieved_at: "2026-09-25T11:55:00.000Z",
  }));
  return { accounts, researchRuns, researchEvidence };
}

test("seven fresh public-research triage candidates with cold unverified contacts stay at zero verified/conversation evidence", () => {
  const base = researchFixture(7);
  const contacts = base.accounts.map((account, i) => ({
    id: contactId(i + 1),
    account_id: account.id,
    buyer_role: "champion",
    relationship_state: "cold",
    contact_route_status: "unverified",
    contact_source_url: null,
    contact_verified_at: null,
  }));
  const result = assessCeoCommercialQualificationEvidence({
    ...base,
    contacts,
    suppressions: [],
    events: [],
    now,
  });

  assert.equal(result.public_research_candidates, 7);
  assert.equal(result.research_triage_qualified_candidates, 7);
  assert.equal(result.verified_contact_route_candidates, 0);
  assert.equal(result.conversation_evidence_qualified_accounts, 0);
  assert.equal(result.verified_sales_qualified_accounts, null);
  assert.equal(result.evidence_status, "verified_account_level_denominators");
  assert.match(result.interpretation, /not automatically an opportunity/i);
});

test("one independently verified contact plus matched conversation and qualification becomes one conversation-evidence account", () => {
  const base = researchFixture(1);
  const contact = {
    id: contactId(1),
    account_id: accountId(1),
    buyer_role: "economic_buyer",
    relationship_state: "engaged",
    contact_route_status: "verified",
    contact_source_url: "https://example.com/team",
    contact_verified_at: "2026-09-26T10:00:00.000Z",
  };
  const result = assessCeoCommercialQualificationEvidence({
    ...base,
    contacts: [contact],
    suppressions: [],
    events: [
      { account_id: accountId(1), contact_id: contact.id, event_type: "conversation_held", occurred_at: "2026-09-28T09:00:00.000Z", recorded_by: actorId },
      { account_id: accountId(1), contact_id: contact.id, event_type: "qualification_completed", occurred_at: "2026-09-28T09:30:00.000Z", recorded_by: actorId },
      { account_id: accountId(1), contact_id: contact.id, event_type: "conversation_held", occurred_at: "2026-09-28T09:00:00.000Z", recorded_by: actorId },
    ],
    now,
  });
  assert.equal(result.public_research_candidates, 1);
  assert.equal(result.research_triage_qualified_candidates, 1);
  assert.equal(result.verified_contact_route_candidates, 1);
  assert.equal(result.conversation_evidence_qualified_accounts, 1, "duplicate events never inflate distinct-account qualification");
});

test("suppression, cross-account events, future events and missing buyer-role evidence fail closed", () => {
  const base = researchFixture(2);
  const contacts = [
    {
      id: contactId(1), account_id: accountId(1), buyer_role: "champion", relationship_state: "engaged",
      contact_route_status: "verified", contact_source_url: "https://example.com/a", contact_verified_at: "2026-09-26T10:00:00.000Z",
    },
    {
      id: contactId(2), account_id: accountId(2), buyer_role: null, relationship_state: "engaged",
      contact_route_status: "verified", contact_source_url: "https://example.com/b", contact_verified_at: "2026-09-26T10:00:00.000Z",
    },
  ];
  const result = assessCeoCommercialQualificationEvidence({
    ...base,
    contacts,
    suppressions: [{ account_id: accountId(1), contact_id: contactId(1), active: true }],
    events: [
      { account_id: accountId(2), contact_id: contactId(1), event_type: "conversation_held", occurred_at: "2026-09-28T09:00:00.000Z", recorded_by: actorId },
      { account_id: accountId(2), contact_id: contactId(2), event_type: "conversation_held", occurred_at: "2026-10-02T09:00:00.000Z", recorded_by: actorId },
      { account_id: accountId(2), contact_id: contactId(2), event_type: "qualification_completed", occurred_at: "2026-09-28T09:30:00.000Z", recorded_by: actorId },
    ],
    now,
  });
  assert.equal(result.verified_contact_route_candidates, 1, "suppressed verified contact is excluded");
  assert.equal(result.conversation_evidence_qualified_accounts, 0);
});

test("a sentinel-bounded read saturation withholds every account-level denominator", () => {
  const result = assessCeoCommercialQualificationEvidence({
    accounts: [],
    researchRuns: [],
    researchEvidence: [],
    contacts: [],
    suppressions: [],
    events: [],
    boundedReadSaturated: true,
    now,
  });
  assert.equal(result.evidence_status, "bounded_read_saturated");
  for (const key of [
    "public_research_candidates",
    "research_triage_qualified_candidates",
    "verified_contact_route_candidates",
    "conversation_evidence_qualified_accounts",
  ]) assert.equal(result[key], null, key);
});

test("the CEO loader uses non-PII bounded sentinel reads and does not revive the ambiguous qualified_accounts key", async () => {
  const source = await readFile(new URL("../lib/agent-os/ceo.ts", import.meta.url), "utf8");
  assert.match(source, /CEO_COMMERCIAL_EVIDENCE_LIMIT = 500/);
  assert.match(source, /CEO_COMMERCIAL_EVIDENCE_READ_LIMIT = CEO_COMMERCIAL_EVIDENCE_LIMIT \+ 1/);
  assert.match(source, /assessCeoCommercialQualificationEvidence/);
  assert.match(source, /commercial_accounts\?select=id/);
  assert.match(source, /commercial_contacts\?select=id,account_id,buyer_role,relationship_state,contact_route_status,contact_source_url,contact_verified_at/);
  assert.doesNotMatch(source, /commercial_contacts\?select=[^\n]*(?:email|full_name)/);
  assert.match(source, /event_type=in\.\(conversation_held,discovery_held,qualification_completed\)/);
  assert.match(source, /rows\.length > CEO_COMMERCIAL_EVIDENCE_LIMIT/);
  assert.match(source, /metric-truth-v3/);
});
