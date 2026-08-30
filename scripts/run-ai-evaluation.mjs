import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { GOLDEN_EVALUATION_DATASET } from "../lib/evaluation/golden-cases.mjs";
import {
  aggregateEvaluationResults,
  assertPrivacySafeDataset,
  buildEvaluationReport,
  detectModelDrift,
  scoreEvaluationCase,
} from "../lib/evaluation/quality-harness.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const inputPath = argumentValue("--input");
if (!inputPath) {
  console.error("Usage: pnpm eval:ai -- --input <capture.json> [--report <report.md>] [--json <summary.json>]");
  process.exitCode = 2;
} else {
  const payload = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const dataset = payload.dataset || GOLDEN_EVALUATION_DATASET;
  assertPrivacySafeDataset(dataset);
  const definitions = new Map(dataset.cases.map((item) => [item.id, item]));
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const results = observations.map((observation) => {
    const definition = definitions.get(observation.caseId);
    if (!definition) throw new Error(`No evaluation definition exists for case ${observation.caseId}.`);
    return scoreEvaluationCase(definition, observation);
  });
  const summary = aggregateEvaluationResults(results);
  const drift = payload.baselineSummary
    ? detectModelDrift(payload.baselineSummary, summary, payload.driftThresholds || {})
    : null;
  const report = buildEvaluationReport({
    runId: payload.runId || `eval-${new Date().toISOString()}`,
    datasetVersion: dataset.version,
    results,
    summary,
    drift,
  });
  const output = { datasetVersion: dataset.version, summary, drift, results };
  const reportPath = argumentValue("--report");
  const jsonPath = argumentValue("--json");
  if (reportPath) await writeFile(resolve(reportPath), report, "utf8");
  if (jsonPath) await writeFile(resolve(jsonPath), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  if (!reportPath) process.stdout.write(report);
}
