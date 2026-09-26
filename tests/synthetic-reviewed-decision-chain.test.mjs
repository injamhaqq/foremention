import assert from "node:assert/strict";
import test from "node:test";
import { assessExactQuestionComparability } from "../lib/intelligence-comparability.ts";
import { buildResolutionProposal, compareResolutionRuns } from "../lib/resolution-engine.ts";
import {
  buildSafeChangeSpecificationDraft,
  validateChangeSpecificationForReview,
} from "../lib/change-specification.ts";
import { assessChangeVerification } from "../lib/change-verification.ts";

// No database, credentials, outbound requests or fabricated external customer evidence.
// This is a deterministic DOMAIN-LEVEL prerequisite to the separate browser +
// isolated-Supabase end-to-end acceptance required by issue #334.
const tenant = "synthetic-fixture-only";
const beforeId = "00000000-0000-4000-8000-000000000101";
const afterId = "00000000-0000-4000-8000-000000000102";
const buyerQuestions = [
  "What evidence should a B2B team examine before choosing a monitoring platform?",
  "Which independent references can verify a vendor's current integration claims?",
  "How should a security team check the provenance of cited documents?",
  "When is an AI recommendation observation comparable across two collection dates?",
  "What limitations should a reviewer include before taking a company-owned action?",
];
const context = Object.freeze({
  locale: "en-US",
  market: "synthetic-market",
  buyerStage: "consideration",
  promptVersion: "1.0",
  parserVersion: "1.0",
  retrievalVersion: "1.0",
  policyVersion: "1.0",
  schemaVersion: "1.0",
  evaluationVersion: "1.0",
});
const slot = (runId, promptText, index, changes = {}) => ({
  runId,
  promptKey: `synthetic-q-${index + 1}`,
  promptText,
  provider: "mock",
  model: "zero-cost-synthetic-fixture-v1",
  measurementContext: { ...context },
  ...changes,
});
const matrix = (changes = {}) => [
  ...buyerQuestions.map((question, index) => slot(beforeId, question, index)),
  ...buyerQuestions.map((question, index) => slot(afterId, question, index, index === 0 ? changes : {})),
];
const verifiedEvidence = {
  id: "00000000-0000-4000-8000-000000000201",
  kind: "source_observation",
  title: "Synthetic reviewed reference — no external claim",
  url: "https://example.org/synthetic-reference",
  observedAt: "2026-09-20T08:00:00Z",
  provider: "mock",
  model: "zero-cost-synthetic-fixture-v1",
  question: buyerQuestions[0],
  excerpt: "Synthetic-only reference text; not genuine customer or vendor evidence.",
  runId: beforeId,
  verification: "verified",
};
const problem = {
  id: "00000000-0000-4000-8000-000000000301",
  title: "A synthetic documentation gap for internal testing",
  nextAction: "Propose a draft on a synthetic customer-owned page",
  sourceId: verifiedEvidence.id,
  sourceTitle: verifiedEvidence.title,
  sourceUrl: verifiedEvidence.url,
};

test("five persisted synthetic questions retain exact provider, model and measurement context across cycles", () => {
  const candidates = matrix();
  assert.equal(candidates.filter((x) => x.runId === beforeId).length, 5);
  assert.equal(candidates.filter((x) => x.runId === afterId).length, 5);
  assert.deepEqual(assessExactQuestionComparability(afterId, beforeId, candidates), {
    comparable: true,
    reason: null,
  });
});

test("mutation of question, provider/model or material measurement context blocks the synthetic second cycle", () => {
  for (const difference of [
    { promptText: "A materially changed buyer question" },
    { provider: "different-mock-provider" },
    { model: "a-different-model" },
    { measurementContext: { ...context, locale: "bn-BD" } },
    { measurementContext: { ...context, market: "a-different-market" } },
    { measurementContext: { ...context, promptVersion: "2.0" } },
    { measurementContext: { ...context, retrievalVersion: null } },
  ]) {
    const assessment = assessExactQuestionComparability(afterId, beforeId, matrix(difference));
    assert.equal(assessment.comparable, false, JSON.stringify(difference));
    assert.match(assessment.reason || "", /question|context|model|matrix/i);
  }
});

test("unreviewed and zero-reference observations never create a synthetic resolution brief", () => {
  assert.throws(() => buildResolutionProposal({
    type: "source_page_brief",
    problem,
    evidence: [],
  }), /requires reviewed/);
  assert.throws(() => buildResolutionProposal({
    type: "source_page_brief",
    problem,
    evidence: [{ ...verifiedEvidence, verification: "unreviewed" }],
  }), /requires reviewed/);
});

test("human-reviewed source drives a customer-owned draft, never an automatically approved company action", () => {
  const proposal = buildResolutionProposal({
    type: "source_page_brief",
    problem,
    evidence: [verifiedEvidence],
  });
  assert.equal(proposal.proposal.schemaVersion, "1.0");
  assert.deepEqual(proposal.proposal.draftSections[0].evidenceIds, [verifiedEvidence.id]);
  assert.ok(proposal.limitations.every((line) => !/guaranteed improvement/i.test(line)));
  assert.match(proposal.proposal.nextStep, /reviewer/i);
  const draft = buildSafeChangeSpecificationDraft({
    opportunityId: problem.id,
    baselineRunId: beforeId,
    title: proposal.title,
    problemStatement: proposal.problemStatement,
  });
  assert.equal(draft.decisionState, "INSUFFICIENT_EVIDENCE");
  assert.equal(draft.truthState, "HYPOTHESIS");
  assert.equal(draft.ownerId, null);
  assert.equal(validateChangeSpecificationForReview({ ...draft, linkedEvidenceCount: 0 }).ok, false);
  assert.equal(validateChangeSpecificationForReview({ ...draft, linkedEvidenceCount: 1 }).ok, false);

  // These are synthetic reviewer inputs. Pure domain functions do not grant
  // roles or attest a real approval; API/DB authorization must be E2E-tested.
  const reviewedDraft = {
    ...draft,
    controlClass: "CONTROLLABLE",
    controlSurface: "synthetic product-owned public documentation",
    eligibilityState: "ELIGIBLE",
    decisionState: "TEST_FIRST",
    exactChange: "Create a synthetic evidence-labeled comparison paragraph.",
    ownerRole: "internal-test-owner",
    effort: "LOW",
    acceptanceCriteria: ["A reviewer verifies the synthetic evidence reference"],
    verificationPlan: { intent: "repeat identical five-question mock observation" },
  };
  assert.deepEqual(validateChangeSpecificationForReview({
    ...reviewedDraft,
    linkedEvidenceCount: 1,
  }), { ok: true, missing: [], invalid: [] });
  assert.equal(validateChangeSpecificationForReview({
    ...reviewedDraft, controlClass: "UNCONTROLLABLE", decisionState: "DO_NOW", linkedEvidenceCount: 1,
  }).ok, false);
});

test("comparable synthetic second-cycle association remains explicitly non-causal", () => {
  assert.equal(assessExactQuestionComparability(afterId, beforeId, matrix()).comparable, true);
  const before = {
    id: beforeId, brandPresencePct: 20, firstMentionPct: 0,
    citationCount: 2, newSourceCount: 1, completedAt: "2026-09-20T08:00:00Z",
  };
  const after = {
    id: afterId, brandPresencePct: 40, firstMentionPct: 20,
    citationCount: 4, newSourceCount: 2, completedAt: "2026-09-27T08:00:00Z",
  };
  const observation = compareResolutionRuns(before, after);
  assert.equal(observation.brandPresencePct.delta, 20);
  assert.match(observation.interpretation, /does not establish.*caused/i);
  const result = assessChangeVerification({ followUpStatus: "complete", outcome: observation });
  assert.equal(result.verificationState, "HIGHER_OBSERVED");
  assert.equal(result.comparisonEligible, true);
  assert.equal(result.causalAttribution, "not_claimed");
  assert.ok(result.limitations.length > 0);

  // A violated comparable baseline must never yield a directional claim.
  assert.equal(assessExactQuestionComparability(afterId, beforeId,
    matrix({ model: "another-model" })).comparable, false);
  const withheld = assessChangeVerification({
    followUpStatus: "incomparable",
    outcome: observation,
    limitation: "The synthetic provider/model identity changed.",
  });
  assert.equal(withheld.verificationState, "INSUFFICIENT_EVIDENCE");
  assert.equal(withheld.comparisonEligible, false);
  assert.equal(withheld.causalAttribution, "not_claimed");
  assert.ok(withheld.reasonCodes.includes("incomparable_measurement"));
});

test("synthetic fixtures do not masquerade as customer activation or external evidence", () => {
  assert.equal(tenant, "synthetic-fixture-only");
  assert.equal(verifiedEvidence.provider, "mock");
  assert.equal(verifiedEvidence.model, "zero-cost-synthetic-fixture-v1");
  assert.match(verifiedEvidence.excerpt, /Synthetic-only/);
});
