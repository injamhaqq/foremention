import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Recommendation Records persist an explicit database-stamped AI measurement version envelope", async () => {
  const [context, migration] = await Promise.all([
    text("lib/ai-measurement-context.ts"),
    text("supabase/migrations/20260830000300_ai_measurement_context.sql"),
  ]);

  for (const key of [
    "promptVersion",
    "parserVersion",
    "provider",
    "model",
    "modelVersion",
    "retrievalVersion",
    "policyVersion",
    "schemaVersion",
    "evaluationVersion",
  ]) {
    assert.match(context, new RegExp(key));
    assert.match(migration, new RegExp(key));
  }
  assert.match(context, /unreported/);
  assert.match(migration, /add column if not exists measurement_context_json jsonb/i);
  assert.match(migration, /before insert on public\.run_answers/i);
  assert.match(migration, /jsonb_build_object/i);
  assert.match(migration, /'modelVersion',\s*'unreported'/i);
  assert.match(migration, /historical rows remain null/i);
});

test("the evaluation harness has an explicit no-network CLI entry point", async () => {
  const [packageJson, runner] = await Promise.all([
    text("package.json"),
    text("scripts/run-ai-evaluation.mjs"),
  ]);
  assert.match(packageJson, /"eval:ai"/);
  assert.match(runner, /assertPrivacySafeDataset/);
  assert.match(runner, /scoreEvaluationCase/);
  assert.match(runner, /aggregateEvaluationResults/);
  assert.match(runner, /buildEvaluationReport/);
  assert.doesNotMatch(runner, /fetch\s*\(/);
});
