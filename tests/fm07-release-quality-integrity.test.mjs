import assert from "node:assert/strict";
import test from "node:test";

import { evaluateReleaseQualityGate } from "../lib/evaluation/release-quality-gate.mjs";

const dataset = {
  cases: [
    { id: "golden-common", category: "common" },
    { id: "golden-failure", category: "provider_failure" },
  ],
};

function check(results, fixture = dataset) {
  return evaluateReleaseQualityGate({
    dataset: fixture,
    results,
    summary: {
      caseCount: results.length,
      metrics: {},
      outputStructureFailureRate: 0,
    },
  });
}

test("quality gate rejects duplicate observations even when total case count matches", () => {
  const outcome = check([
    { caseId: "golden-common", category: "common" },
    { caseId: "golden-common", category: "common" },
  ]);
  assert.equal(outcome.ok, false);
  assert.ok(outcome.failures.includes("Missing scored golden case: golden-failure."));
  assert.ok(outcome.failures.includes("Duplicate scored golden case: golden-common (2 observations)."));
});

test("quality gate rejects a substituted unknown case, not just missing total count", () => {
  const outcome = check([
    { caseId: "golden-common", category: "common" },
    { caseId: "substitute", category: "provider_failure" },
  ]);
  assert.ok(outcome.failures.includes("Unexpected scored golden case: substitute."));
  assert.ok(outcome.failures.includes("Missing scored golden case: golden-failure."));
});

test("quality gate rejects incorrect case categorization", () => {
  const outcome = check([
    { caseId: "golden-common", category: "provider_failure" },
    { caseId: "golden-failure", category: "provider_failure", providerFailure: true },
  ]);
  assert.ok(outcome.failures.includes("golden-common: scored category does not match the golden dataset."));
});

test("quality gate rejects duplicate identifiers in the golden dataset", () => {
  const duplicateDataset = {
    cases: [
      { id: "golden-common", category: "common" },
      { id: "golden-common", category: "common" },
    ],
  };
  const outcome = check([
    { caseId: "golden-common", category: "common" },
    { caseId: "golden-common", category: "common" },
  ], duplicateDataset);
  assert.ok(outcome.failures.includes("Duplicate golden dataset case: golden-common."));
});
