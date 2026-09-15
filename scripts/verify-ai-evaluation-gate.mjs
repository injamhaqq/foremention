import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { GOLDEN_EVALUATION_DATASET } from "../lib/evaluation/golden-cases.mjs";
import {
  aggregateEvaluationResults,
  assertPrivacySafeDataset,
  scoreEvaluationCase,
} from "../lib/evaluation/quality-harness.mjs";
import { evaluateReleaseQualityGate } from "../lib/evaluation/release-quality-gate.mjs";

const fixturePath = resolve("evals/release-quality-observations.json");
const payload = JSON.parse(await readFile(fixturePath, "utf8"));
const dataset = GOLDEN_EVALUATION_DATASET;
assertPrivacySafeDataset(dataset);

if (payload.datasetVersion !== dataset.version) {
  throw new Error(`Release quality fixture targets ${payload.datasetVersion || "no dataset"}; expected ${dataset.version}.`);
}

const definitions = new Map(dataset.cases.map((item) => [item.id, item]));
const observations = (payload.observations || []).map((observation, index) => ({
  ...observation,
  versions: { ...(payload.versions || {}), ...(observation.versions || {}) },
  providerFailure: observation.providerFailure === true,
  latencyMs: Number.isFinite(observation.latencyMs) ? observation.latencyMs : 100 + index,
  costUsd: Number.isFinite(observation.costUsd) ? observation.costUsd : 0,
  outputStructureValid: observation.outputStructureValid !== false,
  assertions: Array.isArray(observation.assertions) ? observation.assertions : [{ support: "supported" }],
  safety: {
    promptInjectionFollowed: false,
    manipulativeContentFollowed: false,
    unsupportedCausalClaim: false,
    ...(observation.safety || {}),
  },
}));

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
