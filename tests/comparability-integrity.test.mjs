import assert from "node:assert/strict";
import test from "node:test";
import { comparableRunSignature, findComparablePrior } from "../lib/comparability-integrity.ts";

const observation = (overrides = {}) => ({
  runId: "latest",
  promptKey: "q1",
  promptText: "Best evidence platform for B2B teams?",
  provider: "groq",
  model: "groq/compound-mini",
  ...overrides,
});

test("comparability signature includes persisted question text, provider, exact model, and methodology", () => {
  const result = comparableRunSignature(
    { id: "latest", methodologyVersion: "3.0" },
    [observation()],
  );
  assert.equal(result.reason, "comparable");
  assert.match(result.signature || "", /Best evidence platform for B2B teams\?/);
  assert.match(result.signature || "", /groq/);
  assert.match(result.signature || "", /groq\/compound-mini/);
  assert.match(result.signature || "", /^3\.0/);
});

test("same prompt key with changed buyer-question wording is not a comparable prior", () => {
  const result = findComparablePrior(
    { id: "latest", methodologyVersion: "3.0" },
    [{ id: "previous", methodologyVersion: "3.0" }],
    [
      observation({ runId: "latest", promptKey: "q1", promptText: "Best evidence platform for B2B teams?" }),
      observation({ runId: "previous", promptKey: "q1", promptText: "Best AI visibility platform?" }),
    ],
  );
  assert.equal(result.latest.reason, "comparable");
  assert.equal(result.previous, null);
});

test("missing exact model provenance withholds comparison even when both runs omit the model", () => {
  const latest = comparableRunSignature(
    { id: "latest", methodologyVersion: "3.0" },
    [observation({ model: null })],
  );
  assert.equal(latest.signature, null);
  assert.equal(latest.reason, "missing_exact_model");
  assert.equal(latest.missingExactModels, 1);
});

test("missing persisted question text withholds comparison instead of falling back to prompt key", () => {
  const latest = comparableRunSignature(
    { id: "latest", methodologyVersion: "3.0" },
    [observation({ promptText: null })],
  );
  assert.equal(latest.signature, null);
  assert.equal(latest.reason, "missing_question_text");
  assert.equal(latest.missingQuestionTexts, 1);
});

test("missing methodology and empty reviewed matrices stay explicit", () => {
  assert.equal(comparableRunSignature({ id: "latest", methodologyVersion: null }, [observation()]).reason, "missing_methodology");
  assert.equal(comparableRunSignature({ id: "latest", methodologyVersion: "3.0" }, []).reason, "empty_reviewed_matrix");
});

test("the nearest exact comparable prior is selected and incomparable neighbors are skipped", () => {
  const result = findComparablePrior(
    { id: "latest", methodologyVersion: "3.0" },
    [
      { id: "near", methodologyVersion: "3.0" },
      { id: "older", methodologyVersion: "3.0" },
    ],
    [
      observation({ runId: "latest" }),
      observation({ runId: "near", promptText: "Changed wording" }),
      observation({ runId: "older" }),
    ],
  );
  assert.equal(result.previous?.id, "older");
});
