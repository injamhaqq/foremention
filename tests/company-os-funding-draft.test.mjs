import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prepareFundingDraft } from "../lib/company-os/funding-draft.ts";

const fixture = () => JSON.parse(readFileSync(new URL("./fixtures/company-os-funding-draft.json", import.meta.url), "utf8"));

test("a current supported opportunity produces an internal review pack without submission authority", async () => {
  const result = await prepareFundingDraft(fixture());
  assert.equal(result.mode, "internal_draft_only");
  assert.equal(result.externalEffects, false);
  assert.equal(result.submissionAuthorized, false);
  assert.equal(result.opportunities[0].eligibility, "eligible");
  assert.equal(result.opportunities[0].readiness, "review_ready");
  assert.equal(result.opportunities[0].answers[0].answer, "Synthetic Example Company");
  assert.equal(result.opportunities[0].answers[0].evidenceId, "company-source");
});

test("a required missing fact is unknown rather than fabricated or ineligible", async () => {
  const input = fixture();
  input.facts = input.facts.filter((fact) => fact.key !== "company.country");
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].eligibility, "unknown");
  assert.equal(result.opportunities[0].readiness, "blocked");
  assert.ok(result.opportunities[0].blockers.includes("criterion:country:missing_fact"));
});

test("unverified and stale facts cannot support eligibility or answers", async () => {
  for (const change of ["unverified", "stale"]) {
    const input = fixture();
    if (change === "unverified") input.facts[0].verification = "unverified";
    else input.evidence[1].observedAt = "2026-08-01T12:00:00Z";
    const result = await prepareFundingDraft(input);
    assert.equal(result.opportunities[0].eligibility, "unknown", change);
    assert.equal(result.opportunities[0].readiness, "blocked", change);
  }
});

test("a known violated criterion establishes ineligibility without filling missing facts", async () => {
  const input = fixture();
  input.facts[0].value = "US";
  input.facts = input.facts.filter((fact) => fact.key !== "company.yearsTrading");
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].eligibility, "ineligible");
  assert.equal(result.opportunities[0].criteria.find((row) => row.id === "age").outcome, "unknown");
});

test("program evidence must be official and current", async () => {
  for (const change of ["secondary", "stale"]) {
    const input = fixture();
    if (change === "secondary") input.evidence[0].authority = "company_record";
    else input.evidence[0].observedAt = "2026-09-01T12:00:00Z";
    const result = await prepareFundingDraft(input);
    assert.equal(result.opportunities[0].eligibility, "unknown");
    assert.equal(result.opportunities[0].readiness, "blocked");
  }
});

test("unknown closing time blocks readiness without guessing a timezone", async () => {
  const input = fixture();
  input.opportunities[0].deadlineAt = null;
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].eligibility, "eligible");
  assert.equal(result.opportunities[0].readiness, "blocked");
  assert.ok(result.opportunities[0].blockers.includes("deadline_unverified"));
});

test("an expired opportunity cannot be review ready", async () => {
  const input = fixture();
  input.opportunities[0].deadlineAt = "2026-10-02T17:00:00+06:00";
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].readiness, "blocked");
  assert.ok(result.opportunities[0].blockers.includes("deadline_passed"));
});

test("unsupported claims remain absent and oversized answers are not silently truncated", async () => {
  const input = fixture();
  input.opportunities[0].questions.push({id:"revenue",prompt:"Verified revenue",factKey:"company.arr",maxChars:100,required:true});
  input.opportunities[0].questions[0].maxChars = 3;
  const result = await prepareFundingDraft(input);
  const rows = result.opportunities[0].answers;
  assert.equal(rows.find((row) => row.id === "revenue").answer, null);
  assert.equal(rows.find((row) => row.id === "company-name").answer, null);
  assert.equal(result.opportunities[0].readiness, "blocked");
});

test("numeric comparisons do not coerce strings into financial or eligibility facts", async () => {
  const input = fixture();
  input.facts[1].value = "1";
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].criteria.find((row) => row.id === "age").outcome, "unknown");
});

test("empty criteria do not establish eligibility", async () => {
  const input = fixture();
  input.opportunities[0].criteria = [];
  const result = await prepareFundingDraft(input);
  assert.equal(result.opportunities[0].eligibility, "unknown");
});

test("equality and inclusion do not turn malformed fact types into verified ineligibility", async () => {
  const input = fixture();
  input.facts[0].value = 123;
  assert.equal((await prepareFundingDraft(input)).opportunities[0].criteria[0].outcome, "unknown");
  input.opportunities[0].criteria[0].operator = "eq";
  input.opportunities[0].criteria[0].expected = "BD";
  assert.equal((await prepareFundingDraft(input)).opportunities[0].criteria[0].outcome, "unknown");
});

test("payload bounds reject sprawling work and mixed-type eligibility conditions", async () => {
  const input = fixture();
  input.opportunities[0].criteria[0].expected = ["BD", 123];
  await assert.rejects(prepareFundingDraft(input), /FUNDING_DRAFT_INVALID/);
  const tooMany = fixture();
  tooMany.opportunities = Array.from({length:11}, (_, index) => ({...structuredClone(tooMany.opportunities[0]),id:"synthetic-"+index}));
  await assert.rejects(prepareFundingDraft(tooMany), /FUNDING_DRAFT_INVALID/);
});

test("duplicate identifiers and unresolved evidence references are rejected", async () => {
  for (const change of ["facts", "evidence", "opportunities", "reference", "criteria", "questions"]) {
    const input = fixture();
    if (change === "reference") input.facts[0].evidenceId = "missing";
    else if (change === "criteria" || change === "questions") input.opportunities[0][change].push(structuredClone(input.opportunities[0][change][0]));
    else input[change].push(structuredClone(input[change][0]));
    await assert.rejects(prepareFundingDraft(input), /FUNDING_DRAFT_INVALID/, change);
  }
});

test("unsafe URLs, future observations, invalid timestamps, and unscoped data fail closed", async () => {
  for (const change of ["url", "future", "calendar", "timezone", "scope"]) {
    const input = fixture();
    if (change === "url") input.evidence[0].url = "http://127.0.0.1/private";
    if (change === "future") input.evidence[0].observedAt = "2026-10-03T12:00:00Z";
    if (change === "calendar") input.asOf = "2026-02-30T12:00:00Z";
    if (change === "timezone") input.opportunities[0].deadlineAt = "2026-10-10";
    if (change === "scope") input.organizationId = "";
    await assert.rejects(prepareFundingDraft(input), /FUNDING_DRAFT_INVALID/, change);
  }
});

test("unknown properties and secret classifications are rejected", async () => {
  for (const change of ["extra", "secret", "operator"]) {
    const input = fixture();
    if (change === "extra") input.apiKey = "never-a-real-key";
    if (change === "secret") input.facts[0].verification = "secret";
    if (change === "operator") input.opportunities[0].criteria[0].operator = "execute";
    await assert.rejects(prepareFundingDraft(input), /FUNDING_DRAFT_INVALID/, change);
  }
});

test("canonical digests survive object key order and change with facts, destination scope, or program rules", async () => {
  const input = fixture();
  const result = await prepareFundingDraft(input);
  const reorder = JSON.parse(JSON.stringify(input, (key, value) => value && !Array.isArray(value) && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse()) : value));
  assert.equal((await prepareFundingDraft(reorder)).inputDigest, result.inputDigest);
  assert.equal((await prepareFundingDraft(fixture())).opportunities[0].reviewDigest, result.opportunities[0].reviewDigest);
  for (const change of ["fact", "scope", "rule"]) {
    const changed = fixture();
    if (change === "fact") changed.facts[2].value = "Different synthetic name";
    if (change === "scope") changed.projectId = "33333333-3333-4333-8333-333333333333";
    if (change === "rule") changed.opportunities[0].criteria[1].expected = 2;
    assert.notEqual((await prepareFundingDraft(changed)).opportunities[0].reviewDigest, result.opportunities[0].reviewDigest, change);
  }
});

test("draft preparation never invokes a model, browser, or network provider", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("network prohibited"); };
  try { await prepareFundingDraft(fixture()); } finally { globalThis.fetch = saved; }
});
