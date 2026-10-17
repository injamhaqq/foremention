import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { GOLDEN_EVALUATION_DATASET } from "../lib/evaluation/golden-cases.mjs";
import {
  aggregateEvaluationResults,
  assertPrivacySafeDataset,
  scoreEvaluationCase,
} from "../lib/evaluation/quality-harness.mjs";
import { evaluateReleaseQualityGate } from "../lib/evaluation/release-quality-gate.mjs";
import { validateReleaseFixtureObservation } from "../lib/evaluation/release-fixture-validation.mjs";

const fixturePath = resolve("evals/release-quality-observations.json");
const payload = JSON.parse(await readFile(fixturePath, "utf8"));
const dataset = GOLDEN_EVALUATION_DATASET;
assertPrivacySafeDataset(dataset);

if (payload.datasetVersion !== dataset.version) {
  throw new Error(`Release quality fixture targets ${payload.datasetVersion || "no dataset"}; expected ${dataset.version}.`);
}

const definitions = new Map(dataset.cases.map((item) => [item.id, item]));
const observations = (payload.observations || []).map((observation) => {
  const definition = definitions.get(observation.caseId);
  if (!definition) throw new Error(`Release fixture references unknown case ${observation.caseId}.`);
  validateReleaseFixtureObservation(observation, definition);
  return {
    ...observation,
    versions: { ...(payload.versions || {}), ...(observation.versions || {}) },
    // Unobserved cost and duration remain null. Do not invent usage or
    // successful assertions to pass deterministic safety evaluations.
    latencyMs: observation.latencyMs ?? null,
    costUsd: observation.costUsd ?? null,
  };
});

const results = observations.map((observation) => {
  const definition = definitions.get(observation.caseId);
  if (!definition) throw new Error(`Release quality fixture references unknown case ${observation.caseId}.`);
  return scoreEvaluationCase(definition, observation);
});
const summary = aggregateEvaluationResults(results);
const gate = evaluateReleaseQualityGate({ dataset, results, summary });

if (!gate.ok) {
  console.error("Foremention deterministic AI quality release gate FAILED:");
  for (const failure of gate.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Foremention deterministic AI quality release gate passed ${summary.caseCount}/${dataset.cases.length} synthetic golden cases.`);
  console.log("This zero-network gate protects deterministic quality floors; it does not claim live-provider drift certification.");
}
