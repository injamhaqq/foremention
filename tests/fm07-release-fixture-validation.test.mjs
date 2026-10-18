import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GOLDEN_EVALUATION_DATASET } from "../lib/evaluation/golden-cases.mjs";
import { validateReleaseFixtureObservation } from "../lib/evaluation/release-fixture-validation.mjs";

const payload = JSON.parse(readFileSync(new URL("../evals/release-quality-observations.json", import.meta.url), "utf8"));
const definitions = new Map(GOLDEN_EVALUATION_DATASET.cases.map((item) => [item.id, item]));
const base = payload.observations.find((observation) => observation.caseId === "common-category-recommendation");
const failed = payload.observations.find((observation) => observation.caseId === "provider-timeout");
const definition = definitions.get(base.caseId);

test("all synthetic release cases have explicitly assessed verdicts", () => {
  assert.equal(payload.observations.length, GOLDEN_EVALUATION_DATASET.cases.length);
  for (const observation of payload.observations) {
    assert.equal(validateReleaseFixtureObservation(observation, definitions.get(observation.caseId)), observation);
  }
  assert.equal(failed.outputStructureValid, null, "provider timeout has no assessable output structure");
  assert.deepEqual(failed.assertions, [], "a provider timeout cannot provide supported text");
  assert.ok(payload.observations.every((observation) => observation.latencyMs === undefined && observation.costUsd === undefined),
    "synthetic case fixtures must not masquerade as billable costs or measured latency");
});

test("missing verdicts cannot silently become passing synthetic observations", () => {
  for (const field of ["providerFailure", "outputStructureValid", "assertions", "citations"]) {
    const corrupted = structuredClone(base);
    delete corrupted[field];
    assert.throws(() => validateReleaseFixtureObservation(corrupted, definition), new RegExp(field));
  }
  const empty = { ...structuredClone(base), assertions: [] };
  assert.throws(() => validateReleaseFixtureObservation(empty, definition), /assessed output assertions/);
});

test("safety decisions cannot default to false when missing or unreviewed", () => {
  for (const key of ["promptInjectionFollowed", "manipulativeContentFollowed", "unsupportedCausalClaim"]) {
    const corrupted = structuredClone(base);
    delete corrupted.safety[key];
    assert.throws(() => validateReleaseFixtureObservation(corrupted, definition), new RegExp(key));
  }
});

test("provider failure must remain explicit, without synthetic output assertions", () => {
  assert.throws(() => validateReleaseFixtureObservation({
    ...structuredClone(failed), outputStructureValid: true,
  }, definitions.get(failed.caseId)), /no output structure to assess/);
  assert.throws(() => validateReleaseFixtureObservation({
    ...structuredClone(failed), assertions: [{ support: "supported" }],
  }, definitions.get(failed.caseId)), /cannot have reviewed output assertions/);
  assert.throws(() => validateReleaseFixtureObservation({
    ...structuredClone(base), providerFailure: true,
  }, definition), /contradicts its expected golden category/);
});

test("unknown or invalid cost and latency are not silently coerced to zero", () => {
  for (const key of ["latencyMs", "costUsd"]) {
    for (const bad of [-1, "0.00", Number.NaN]) {
      assert.throws(() => validateReleaseFixtureObservation({ ...structuredClone(base), [key]: bad }, definition),
        new RegExp(key));
    }
    assert.doesNotThrow(() => validateReleaseFixtureObservation({ ...structuredClone(base), [key]: null }, definition));
  }
});

test("release runner does not default unassessed output or cost fields", () => {
  const source = readFileSync(new URL("../scripts/verify-ai-evaluation-gate.mjs", import.meta.url), "utf8");
  assert.match(source, /validateReleaseFixtureObservation\(observation, definition\)/);
  assert.doesNotMatch(source, /assertions: Array\.isArray\(observation\.assertions\)/);
  assert.doesNotMatch(source, /outputStructureValid: observation\.outputStructureValid !== false/);
  assert.doesNotMatch(source, /costUsd: Number\.isFinite\(observation\.costUsd\) \? observation\.costUsd : 0/);
  assert.doesNotMatch(source, /latencyMs: Number\.isFinite\(observation\.latencyMs\) \? observation\.latencyMs : 100/);
});
