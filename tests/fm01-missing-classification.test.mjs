import assert from "node:assert/strict";
import test from "node:test";
import { buildObservationEnvelope, summarizeVisibility, observationOutcome } from "../lib/evidence-provenance.mjs";

test("CV-01/A08: observed answer with missing brand classification is unknown, not 0%", () => {
  const unknown = summarizeVisibility([
    { status: "complete", answer: "Tools include Alpha and Beta." },
    { status: "complete", answer: "Teams can choose a CRM.", brandPresent: null },
  ]);
  assert.equal(unknown.observed, 2);
  assert.equal(unknown.classified, 0);
  assert.equal(unknown.unclassified, 2);
  assert.equal(unknown.denominator, 0);
  assert.equal(unknown.value, null);
  assert.equal(unknown.withheldReason, "NO_CLASSIFIED_OBSERVATIONS");
});

test("CV-11: partial known brand classifications use only typed booleans in denominator", () => {
  const sample = summarizeVisibility([
    { status: "complete", answer: "Alpha is recommended.", brandPresent: true },
    { status: "complete", answer: "Beta is recommended.", brandPresent: false },
    { status: "complete", answer: "Gamma is recommended." },
    { status: "complete", answer: "I can't verify that", brandPresent: false },
    { status: "failed", httpStatus: 422 },
  ]);
  assert.equal(sample.observed, 3);
  assert.equal(sample.classified, 2);
  assert.equal(sample.unclassified, 1);
  assert.equal(sample.abstained, 1);
  assert.equal(sample.evidence_unavailable, 1);
  assert.equal(sample.denominator, 2);
  assert.equal(sample.value, 50);
  const strict = summarizeVisibility([
    { status: "complete", answer: "Alpha is recommended.", brandPresent: true },
    { status: "complete", answer: "Gamma is recommended." },
  ], { requireComplete: true });
  assert.equal(strict.value, null);
  assert.equal(strict.withheldReason, "INCOMPLETE_OBSERVATION_SET");
  assert.equal(summarizeVisibility([{ status: "complete", answer: "Beta" , brandPresent: false }]).value, 0);
});

test("CV-02: unknown measurement method stays null, never silently native", () => {
  const sample = buildObservationEnvelope({
    provider: "openai", model: "pinned", answer: "Beta", citations: [],
    raw: { grounded: true }, collectedAt: "2026-10-12T00:00:00Z",
  });
  assert.equal(sample.method, null);
  assert.ok(sample.unavailable.includes("method"));
  assert.equal(sample.consumerProductObservation, false);
  const declared = buildObservationEnvelope({
    provider: "cloudflare", model: "pinned", answer: "Beta",
    citations: [], raw: { observationMethod: "api_hosted_model_with_independent_retrieval" },
  });
  assert.equal(declared.method, "api_hosted_model_with_independent_retrieval");
  assert.equal(declared.unavailable.includes("method"), false);
});

test("A08: no answers and explicit unavailable cannot be represented as zero coverage", () => {
  assert.equal(observationOutcome({ status: "failed", httpStatus: 403 }), "evidence_unavailable");
  const empty = summarizeVisibility([]);
  assert.equal(empty.value, null);
  assert.equal(empty.denominator, 0);
  assert.equal(empty.withheldReason, "NO_OBSERVED_ANSWERS");
});
