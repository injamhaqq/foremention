import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = new URL("../supabase/migrations/20260813160000_resolution_exact_comparability.sql", import.meta.url);

test("resolution follow-up requires the same methodology version", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /baseline_run\.methodology_version is distinct from follow_up_run\.methodology_version/i);
  assert.match(sql, /nullif\(trim\(baseline_run\.methodology_version\), ''\) is null/i);
  assert.match(sql, /nullif\(trim\(follow_up_run\.methodology_version\), ''\) is null/i);
});

test("resolution follow-up compares the exact reviewed buyer-question provider model matrix", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /review_status::text <> 'verified'/i);
  assert.match(sql, /nullif\(trim\(prompt_key\), ''\) is null/i);
  assert.match(sql, /nullif\(trim\(prompt_text\), ''\) is null/i);
  assert.match(sql, /nullif\(trim\(model\), ''\) is null/i);
  assert.match(sql, /select distinct prompt_key, prompt_text, provider, model[\s\S]*?except[\s\S]*?select distinct prompt_key, prompt_text, provider, model/i);
});

test("failed comparability is preserved as incomparable without a causal outcome", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /new\.status := 'incomparable'/i);
  assert.match(sql, /did not calculate a comparable before-and-after result/i);
  assert.match(sql, /Observed before-and-after association only/i);
  assert.match(sql, /does not establish that the applied resolution caused the change/i);
  assert.doesNotMatch(sql, /caused the improvement|caused the increase|guarantee/i);
});
