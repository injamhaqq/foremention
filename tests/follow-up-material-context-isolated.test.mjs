import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { assessExactQuestionComparability } from "../lib/intelligence-comparability.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const materialFields = [
  "locale", "market", "buyerStage", "promptVersion", "parserVersion",
  "retrievalVersion", "policyVersion", "schemaVersion", "evaluationVersion",
];
const context = Object.fromEntries(materialFields.map(field => [field, field + "-fixture"]));
const slot = (runId, overrides = {}) => ({
  runId, promptKey: "q1", promptText: "Which independent synthetic evidence matters?",
  provider: "fixture-mock", model: "no-cost-model-v1",
  measurementContext: { ...context }, ...overrides,
});

test("app comparator and staged database follow-up guard enumerate identical nine required context fields", async () => {
  const [source, staged, sql] = await Promise.all([
    read("../lib/intelligence-comparability.ts"),
    read("../scripts/staging/resolution-material-context-parity.sql"),
    read("../scripts/verify-follow-up-material-context.sql"),
  ]);
  const declared = source.match(/const measurementKeys:[\s\S]*?= \[([\s\S]*?)\];/)?.[1];
  assert.ok(declared, "canonical source key array exists");
  const actual = [...declared.matchAll(/"([a-zA-Z]+)"/g)].map(x => x[1]);
  assert.deepEqual(actual, materialFields);
  assert.ok(materialFields.every(name => staged.includes("'" + name + "'")));
  assert.match(staged, /jsonb_typeof\(a\.measurement_context_json\) is distinct from 'object'/);
  assert.match(staged, /jsonb_typeof\(a\.measurement_context_json -> required\.field\) is distinct from 'string'/);
  assert.match(staged, /except all/i);
  assert.ok(sql.includes(String.raw`\i scripts/staging/resolution-material-context-parity.sql`));
  assert.match(sql, /for case_number in 1\.\.10 loop/);
  assert.match(sql, /incomparable/);
  assert.match(sql, /did not calculate/);
  assert.match(sql, /rollback;/);
});

test("all nine normalized version fields fail closed individually, including missing legacy fields", () => {
  for (const field of materialFields) {
    const changed = slot("later", { measurementContext: { ...context, [field]: "different" } });
    const result = assessExactQuestionComparability("later", "before", [changed, slot("before")]);
    assert.equal(result.comparable, false, "changed " + field);
    assert.ok(result.reason);
    const missing = slot("later", { measurementContext: { ...context, [field]: null } });
    assert.equal(assessExactQuestionComparability("later", "before", [missing, slot("before")]).comparable, false, "missing " + field);
  }
  const good = assessExactQuestionComparability("later", "before", [slot("later"), slot("before")]);
  assert.deepEqual(good, { comparable: true, reason: null });
});

test("staged SQL remains strictly nonproduction, no silent backfill or history repair", async () => {
  const [sql, ci] = await Promise.all([
    read("../scripts/verify-follow-up-material-context.sql"),
    read("../.github/workflows/ci.yml"),
  ]);
  assert.match(ci, /supabase db reset/);
  assert.match(ci, /node scripts\/expand-isolated-context-sql\.mjs \| docker exec -i supabase_db_foremention-mvp psql/);
  const expander = await read("../scripts/expand-isolated-context-sql.mjs");
  assert.match(expander, /fixture\.split\(directive\)\.length !== 2/);
  assert.match(expander, /fixture\.replace\(directive, staged\)/);
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^rollback;$/m);
  assert.match(sql, /no provider is called/i);
  assert.doesNotMatch(sql, /https?:\/\/(?:www\.|api\.)/i);
  assert.doesNotMatch(sql, /update\s+supabase_migrations|update\s+auth\.users|supabase db push/i);
});
