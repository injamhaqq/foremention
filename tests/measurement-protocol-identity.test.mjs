import assert from "node:assert/strict";
import test from "node:test";
import { assessExactQuestionComparability, coerceComparableMeasurementContext } from "../lib/intelligence-comparability.ts";
import { assessCompleteVerifiedRunPair } from "../lib/run-pair-answer-gate.ts";
import { answerRowToSlot } from "../lib/customer-value-loop-snapshot.ts";
import { assessLaterCycle } from "../lib/customer-value-loop.ts";

const context = {
  locale: "en-US", market: "US", buyerStage: "evaluation", promptVersion: "p1", parserVersion: "a1",
  retrievalVersion: "r1", policyVersion: "q1", schemaVersion: "s1", evaluationVersion: "e1",
  modelVersion: "synthetic-revision-1", observationMethod: "provider_api", retrievalProvider: "native-provider-search",
};
const slot = (runId, changes = {}) => ({ runId, promptKey: "q1", promptText: "Which platform fits?", provider: "mock", model: "fixture", measurementContext: coerceComparableMeasurementContext({ ...context, ...changes }) });
const compare = (changes = {}) => assessExactQuestionComparability("later", "earlier", [slot("earlier"), slot("later", changes)]);

test("same explicitly recorded protocol is comparable; actual provider, method and revision drift are withheld", () => {
  assert.equal(compare().comparable, true);
  for (const changes of [
    { retrievalProvider: "different-search" }, { observationMethod: "authorized_consumer_ui" }, { modelVersion: "synthetic-revision-2" },
  ]) assert.equal(compare(changes).comparable, false, JSON.stringify(changes));
});

test("legacy or unknown protocol identity never counts as the same known protocol", () => {
  for (const field of ["modelVersion", "observationMethod", "retrievalProvider"]) {
    for (const missing of [undefined, null, "", "unknown", "unreported", "UNKNOWN", "unspecified", 42, {}, "bad\u0000identity"]) {
      const rows = [slot("earlier", { [field]: missing }), slot("later", { [field]: missing })];
      assert.equal(assessExactQuestionComparability("later", "earlier", rows).comparable, false, `${field}:${JSON.stringify(missing)}`);
    }
  }
});

test("stored adapter metadata is retained and contradictory identity fails closed", () => {
  const legacy = { ...context };
  delete legacy.observationMethod; delete legacy.retrievalProvider;
  const raw = { observationMethod: "provider_api", retrievalProvider: "brave-search" };
  const projected = coerceComparableMeasurementContext(legacy, raw);
  assert.equal(projected.observationMethod, raw.observationMethod);
  assert.equal(projected.retrievalProvider, raw.retrievalProvider);
  assert.equal(Object.hasOwn(legacy, "observationMethod"), false);
  assert.equal(Object.hasOwn(legacy, "retrievalProvider"), false);
});

test("conflicting and malformed adapter metadata cannot be hidden behind a context field", () => {
  for (const field of ["observationMethod", "retrievalProvider"]) {
    for (const value of ["conflicting-value", null, {}, 1, "unreported"]) {
      const actual = coerceComparableMeasurementContext(context, { [field]: value });
      assert.equal(actual[field], null, `${field}:${JSON.stringify(value)}`);
    }
  }
});

test("complete stored-pair gate reads actual adapter retrieval identity before reporting movement", () => {
  const stored = (run_id, retrievalProvider) => ({ run_id, prompt_key: "q1", prompt_text: "Which platform fits?", provider: "mock", model: "fixture",
    measurement_context_json: { ...context, observationMethod: undefined, retrievalProvider: undefined },
    raw_json: { observationMethod: "provider_api", retrievalProvider },
  });
  const a = { id: "earlier", answer_count: 1 }, b = { id: "later", answer_count: 1 };
  assert.equal(assessCompleteVerifiedRunPair(a, b, [stored(a.id, "brave-search"), stored(b.id, "brave-search")]).comparable, true);
  assert.equal(assessCompleteVerifiedRunPair(a, b, [stored(a.id, "brave-search"), stored(b.id, "bing-rss")]).comparable, false);
});

test("customer-cycle mapper keeps the same protocol and does not infer it from model/provider names", () => {
  const row = { run_id: "earlier", prompt_key: "q1", prompt_text: "Which platform fits?", provider: "mock", model: "fixture", review_status: "verified",
    observation_method: "provider_api", sampling_json: { n: 1 }, measurement_context_json: { ...context, observationMethod: undefined, retrievalProvider: undefined },
    raw_json: { observationMethod: "provider_api", retrievalProvider: "brave-search" },
  };
  const mapped = answerRowToSlot(row);
  assert.equal(mapped.measurementContext.retrievalProvider, "brave-search");
  assert.equal(mapped.measurementContext.observationMethod, "provider_api");
  assert.equal(answerRowToSlot({ ...row, raw_json: {} }).measurementContext.retrievalProvider, null);
  assert.equal(answerRowToSlot({ ...row, observation_method: "authorized_consumer_ui" }).measurementContext.observationMethod, null);
});

test("malformed direct context values withhold instead of crashing", () => {
  const malformed = slot("later");
  malformed.measurementContext.locale = 123;
  assert.doesNotThrow(() => assessExactQuestionComparability("later", "earlier", [slot("earlier"), malformed]));
  assert.equal(assessExactQuestionComparability("later", "earlier", [slot("earlier"), malformed]).comparable, false);
});

test("persisted customer-cycle path withholds actual retrieval drift despite equal declared version labels", () => {
  const run = (id, createdAt, retrievalProvider) => ({
    id, organizationId: "org-a", projectId: "project-a", status: "complete", createdAt,
    methodologyVersion: "method-1", questionSetVersion: 1, origin: "fixture",
    answers: [answerRowToSlot({
      run_id: id, prompt_key: "q1", prompt_text: "Which platform fits?", provider: "mock", model: "fixture",
      review_status: "verified", observation_method: "provider_api", sampling_json: { n: 1 },
      measurement_context_json: { ...context, observationMethod: undefined, retrievalProvider: undefined },
      raw_json: { observationMethod: "provider_api", retrievalProvider },
    })],
  });
  const baseline = run("earlier", "2026-10-01T00:00:00Z", "brave-search");
  assert.equal(assessLaterCycle(baseline, run("later", "2026-10-08T00:00:00Z", "brave-search")).status, "comparable");
  assert.equal(assessLaterCycle(baseline, run("later", "2026-10-08T00:00:00Z", "bing-rss")).status, "not_comparable");
});

test("structured slot identity cannot collide when adjacent fields contain a separator", () => {
  const a = slot("earlier"), b = slot("later");
  a.promptText = "question\u0000provider"; a.provider = "mock";
  b.promptText = "question"; b.provider = "provider\u0000mock";
  assert.equal(assessExactQuestionComparability("later", "earlier", [a, b]).comparable, false);
});

test("JSON subfield projections preserve type and do not need full raw provider bodies", () => {
  const row = (run_id, retrieval) => ({ run_id, prompt_key: "q1", prompt_text: "Which platform fits?", provider: "mock", model: "fixture",
    measurement_context_json: { ...context, observationMethod: undefined, retrievalProvider: undefined },
    protocol_observation_method: "provider_api", protocol_retrieval_provider: retrieval,
  });
  const a = { id: "earlier", answer_count: 1 }, b = { id: "later", answer_count: 1 };
  assert.equal(assessCompleteVerifiedRunPair(a, b, [row(a.id, "brave-search"), row(b.id, "brave-search")]).comparable, true);
  for (const invalid of ["bing-rss", null, 42, {}]) {
    assert.equal(assessCompleteVerifiedRunPair(a, b, [row(a.id, "brave-search"), row(b.id, invalid)]).comparable, false);
  }
});
