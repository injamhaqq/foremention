import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateEvaluationResults,
  assertPrivacySafeDataset,
  buildEvaluationReport,
  compareRepeatedObservations,
  detectModelDrift,
  scoreEvaluationCase,
  validateRecommendationQuality,
  validateVersionContext,
} from "../lib/evaluation/quality-harness.mjs";
import { GOLDEN_EVALUATION_DATASET } from "../lib/evaluation/golden-cases.mjs";

const versions = {
  promptVersion: "prompt.v1",
  parserVersion: "parser.v1",
  provider: "groq",
  model: "example-model",
  modelVersion: "provider-reported-2026-08",
  retrievalVersion: "retrieval.v1",
  policyVersion: "policy.v1",
  schemaVersion: "record.v1",
  evaluationVersion: "eval.v1",
};

test("golden evaluation set is synthetic and spans the required failure modes", () => {
  assertPrivacySafeDataset(GOLDEN_EVALUATION_DATASET);
  const categories = new Set(GOLDEN_EVALUATION_DATASET.cases.map((item) => item.category));
  for (const required of [
    "common",
    "difficult",
    "ambiguous",
    "missing_evidence",
    "provider_failure",
    "contradictory_evidence",
    "citation_error",
    "competitor_heavy",
    "no_recommendation",
    "prompt_injection",
    "malicious_page",
    "stale_source",
    "inaccessible_source",
    "manipulative_content",
    "unsupported_causal_inference",
  ]) {
    assert.equal(categories.has(required), true, `missing ${required}`);
  }
  assert.equal(GOLDEN_EVALUATION_DATASET.cases.every((item) => item.privacy?.classification === "synthetic"), true);
});

test("customer-confidential evaluation data is rejected without an explicit approved boundary", () => {
  assert.throws(() => assertPrivacySafeDataset({
    version: "unsafe.v1",
    cases: [{ id: "unsafe", category: "common", question: "private", privacy: { classification: "customer_confidential" } }],
  }), /approved boundary/i);

  assert.doesNotThrow(() => assertPrivacySafeDataset({
    version: "approved.v1",
    approvedBoundaryId: "dp-approval-123",
    cases: [{ id: "approved", category: "common", question: "approved", privacy: { classification: "customer_confidential" } }],
  }));
});

test("measurement context requires every reproducibility version dimension", () => {
  assert.deepEqual(validateVersionContext(versions), versions);
  const incomplete = { ...versions };
  delete incomplete.parserVersion;
  assert.throws(() => validateVersionContext(incomplete), /parserVersion/);
  assert.throws(() => validateVersionContext({ ...versions, modelVersion: "" }), /modelVersion/);
});

test("objective metrics retain numerators and denominators instead of inventing an accuracy score", () => {
  const definition = {
    id: "metric-case",
    category: "common",
    question: "Which product fits this buyer need?",
    privacy: { classification: "synthetic" },
    expected: {
      relevantCitationUrls: ["https://a.example/doc", "https://b.example/doc"],
      evidenceState: "observed",
      classification: "competitor_present",
      comparisonEligible: true,
      duplicateCanonicalUrls: ["https://a.example/doc"],
    },
  };
  const observation = {
    caseId: definition.id,
    versions,
    providerFailure: false,
    citations: [
      { url: "https://a.example/doc?utm_source=x", retrievable: true, evidenceCorrect: true },
      { url: "https://a.example/doc", retrievable: true, evidenceCorrect: true },
      { url: "https://b.example/doc", retrievable: false, evidenceCorrect: false },
      { url: "https://irrelevant.example/page", retrievable: true, evidenceCorrect: false },
    ],
    evidenceState: "observed",
    classification: "competitor_present",
    comparisonEligible: true,
    assertions: [
      { support: "supported" },
      { support: "unsupported" },
      { support: "contradicted" },
    ],
    humanReviewDecision: "rejected",
    latencyMs: 900,
    costUsd: 0.05,
    outputStructureValid: true,
    extractedItems: ["Acme", "Beta"],
    safety: {
      promptInjectionFollowed: false,
      manipulativeContentFollowed: false,
      unsupportedCausalClaim: true,
    },
  };

  const result = scoreEvaluationCase(definition, observation);
  assert.deepEqual(result.metrics.retrievalPrecision, { numerator: 2, denominator: 3, value: 2 / 3 });
  assert.deepEqual(result.metrics.retrievalCoverage, { numerator: 2, denominator: 2, value: 1 });
  assert.deepEqual(result.metrics.citationSurvival, { numerator: 2, denominator: 3, value: 2 / 3 });
  assert.deepEqual(result.metrics.evidenceCorrectness, { numerator: 1, denominator: 3, value: 1 / 3 });
  assert.deepEqual(result.metrics.evidenceStateCorrectness, { numerator: 1, denominator: 1, value: 1 });
  assert.deepEqual(result.metrics.duplicateDetectionCorrectness, { numerator: 1, denominator: 1, value: 1 });
  assert.deepEqual(result.metrics.classificationAccuracy, { numerator: 1, denominator: 1, value: 1 });
  assert.deepEqual(result.metrics.unsupportedConclusionRate, { numerator: 2, denominator: 3, value: 2 / 3 });
  assert.deepEqual(result.metrics.hallucinationErrorRate, { numerator: 1, denominator: 3, value: 1 / 3 });
  assert.deepEqual(result.metrics.comparisonEligibilityCorrectness, { numerator: 1, denominator: 1, value: 1 });
  assert.deepEqual(result.metrics.providerFailureRate, { numerator: 0, denominator: 1, value: 0 });
  assert.equal(result.reviewDecision, "rejected");
  assert.equal(result.flags.unsupportedCausalInference, true);
});

test("metrics without ground truth are explicitly not assessed", () => {
  const result = scoreEvaluationCase({
    id: "unknown-ground-truth",
    category: "ambiguous",
    question: "Ambiguous question",
    privacy: { classification: "synthetic" },
    expected: {},
  }, {
    caseId: "unknown-ground-truth",
    versions,
    providerFailure: false,
    citations: [],
    assertions: [],
    outputStructureValid: true,
  });
  assert.equal(result.metrics.retrievalPrecision, null);
  assert.equal(result.metrics.retrievalCoverage, null);
  assert.equal(result.metrics.evidenceStateCorrectness, null);
  assert.equal(result.metrics.classificationAccuracy, null);
  assert.equal(result.metrics.comparisonEligibilityCorrectness, null);
});

test("question consistency is measured across repeated observations without semantic guessing", () => {
  const consistency = compareRepeatedObservations([
    { caseId: "q1", provider: "groq", model: "m", classification: "present", extractedItems: ["A", "B"] },
    { caseId: "q1", provider: "groq", model: "m", classification: "present", extractedItems: ["A", "B"] },
    { caseId: "q1", provider: "groq", model: "m", classification: "absent", extractedItems: ["A", "C"] },
  ]);
  assert.deepEqual(consistency.classificationAgreement, { numerator: 1, denominator: 3, value: 1 / 3 });
  assert.equal(consistency.extractionConsistency.denominator, 3);
  assert.equal(consistency.extractionConsistency.value > 0 && consistency.extractionConsistency.value < 1, true);
});

test("recommendation quality guard rejects blurred epistemic states and missing human approval", () => {
  const valid = validateRecommendationQuality({
    kind: "recommendation",
    statement: "Run a controlled content test against the reviewed evidence gap.",
    evidenceIds: ["evidence-1"],
    confidence: { level: "medium", rationale: "One reviewed comparable cycle." },
    limitations: ["No causal attribution has been established."],
    expectedBenefit: "Tests whether the observed evidence gap is addressable.",
    effort: "medium",
    rationale: "The recommendation is tied to a reviewed observation, not a ranking guarantee.",
    humanApproval: { required: true, status: "pending" },
  });
  assert.equal(valid.ok, true);

  const invalid = validateRecommendationQuality({
    kind: "recommendation",
    statement: "Do this because it will cause the model to rank us first.",
    evidenceIds: [],
    confidence: { level: "high", rationale: "" },
    limitations: [],
    expectedBenefit: "Guaranteed first place",
    effort: "low",
    rationale: "",
    humanApproval: { required: false, status: "approved" },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.some((error) => /evidence/i.test(error)), true);
  assert.equal(invalid.errors.some((error) => /human approval/i.test(error)), true);
});

test("model drift reports identity, citation, structure, cost, latency, and failure changes independently", () => {
  const baseline = {
    providers: ["groq"],
    models: ["m"],
    modelVersions: ["v1"],
    citationCountMean: 4,
    outputStructureFailureRate: 0,
    providerFailureRate: 0.05,
    latencyMsP95: 1000,
    costUsdMean: 0.05,
  };
  const candidate = {
    providers: ["groq"],
    models: ["m"],
    modelVersions: ["v2"],
    citationCountMean: 2,
    outputStructureFailureRate: 0.2,
    providerFailureRate: 0.25,
    latencyMsP95: 1800,
    costUsdMean: 0.08,
  };
  const drift = detectModelDrift(baseline, candidate, {
    citationMeanRelativeChange: 0.25,
    outputStructureFailureRateDelta: 0.1,
    providerFailureRateDelta: 0.1,
    latencyP95RelativeChange: 0.5,
    costMeanRelativeChange: 0.25,
  });
  assert.equal(drift.hasDrift, true);
  for (const kind of ["model_version_shift", "citation_pattern_change", "output_structure_change", "failure_rate_change", "latency_change", "cost_change"]) {
    assert.equal(drift.signals.some((signal) => signal.kind === kind), true, `missing ${kind}`);
  }
});

test("internal report exposes real denominators, review outcomes, provider/model slices, and no vanity composite", () => {
  const caseDefinition = {
    id: "report-case",
    category: "common",
    question: "Question",
    privacy: { classification: "synthetic" },
    expected: { classification: "present" },
  };
  const result = scoreEvaluationCase(caseDefinition, {
    caseId: "report-case",
    versions,
    providerFailure: false,
    citations: [],
    assertions: [{ support: "supported" }],
    classification: "present",
    humanReviewDecision: "accepted",
    outputStructureValid: true,
    latencyMs: 500,
    costUsd: 0.01,
  });
  const summary = aggregateEvaluationResults([result]);
  const report = buildEvaluationReport({
    runId: "eval-run-1",
    datasetVersion: "golden.synthetic.v1",
    results: [result],
    summary,
  });
  assert.match(report, /numerator/i);
  assert.match(report, /denominator/i);
  assert.match(report, /accepted/i);
  assert.match(report, /groq/i);
  assert.match(report, /example-model/i);
  assert.doesNotMatch(report, /overall accuracy|ai accuracy|99%/i);
});
