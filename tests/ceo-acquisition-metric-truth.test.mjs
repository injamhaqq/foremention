import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { presentLegacyCeoScorecard } from "../lib/ceo-acquisition-metric-truth.ts";

test("seven public-research internal flags with no recorded first-party conversations cannot become seven sales-qualified buyers", () => {
  const raw = {
    target_accounts: 7,
    qualified_accounts: 7,
    conversations: 0,
    paying_organizations: 0,
    verified_paid_value_usd: 0,
  };
  const { company, commercialQualificationEvidence: proof } = presentLegacyCeoScorecard(raw);
  assert.equal(company.internally_qualification_flagged_accounts, 7);
  assert.equal(Object.hasOwn(company, "qualified_accounts"), false);
  assert.equal(proof.recorded_conversation_events, 0);
  assert.equal(proof.internally_qualification_flagged_accounts, 7);
  assert.equal(proof.verified_contact_route_candidates, null);
  assert.equal(proof.conversation_evidence_qualified_accounts, null);
  assert.equal(proof.verified_sales_qualified_accounts, null);
  assert.equal(proof.research_triage_qualified_candidates, null,
    "The old view does not distinguish which internal flags originated in public research");
  assert.equal(company.paying_organizations, 0);
  assert.match(proof.interpretation, /NOT verified buyer intent/);
});

test("a recorded conversation event is activity, not proof of a unique qualified account", () => {
  const x = presentLegacyCeoScorecard({ qualified_accounts: 13, conversations: 25 });
  assert.equal(x.commercialQualificationEvidence.recorded_conversation_events, 25);
  assert.equal(x.commercialQualificationEvidence.conversation_evidence_qualified_accounts, null);
  assert.equal(x.commercialQualificationEvidence.verified_sales_qualified_accounts, null);
});

test("missing, fractional and implausible legacy counters fail closed instead of fabricating qualification", () => {
  for (const invalid of [null, -1, 0.5, "NaN", "3.5", Number.MAX_SAFE_INTEGER + 2, true]) {
    const x = presentLegacyCeoScorecard({ qualified_accounts: invalid, conversations: invalid });
    assert.equal(x.company.internally_qualification_flagged_accounts, null);
    assert.equal(x.commercialQualificationEvidence.recorded_conversation_events, null);
    assert.equal(x.commercialQualificationEvidence.verified_sales_qualified_accounts, null);
  }
  const zero = presentLegacyCeoScorecard({ qualified_accounts: "0", conversations: 0 });
  assert.equal(zero.company.internally_qualification_flagged_accounts, 0);
  assert.equal(zero.commercialQualificationEvidence.verified_sales_qualified_accounts, null,
    "Zero old internal flags does not establish a separately measured external-qualified denominator");
});

test("daily CEO brief embeds the qualification caveat and never forwards qualified_accounts unlabelled", async () => {
  const source = await readFile(new URL("../lib/agent-os/ceo.ts", import.meta.url), "utf8");
  assert.match(source, /presentLegacyCeoScorecard\(companyRows\[0\] \|\| \{\}\)/);
  assert.match(source, /commercialQualificationEvidence,/);
  assert.match(source, /flagged accounts are NOT independently contact-verified/);
  assert.match(source, /metric-truth-v3/);
  assert.doesNotMatch(source, /const company = companyRows\[0\] \|\| \{\}/);
  assert.match(source, /company_ceo_scorecard\?select=\*&limit=1/);
  assert.doesNotMatch(source, /commercial_contacts\\?select=[^\\n]*(?:email|full_name)/);
});
