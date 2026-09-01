import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260901000200_measurement_moat_foundation.sql";

test("measurement context persists locale market buyer stage and version identity", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create or replace function public\.stamp_run_answer_measurement_context/i);
  assert.match(sql, /from public\.prompts/i);
  assert.match(sql, /'locale'/i);
  assert.match(sql, /'market'/i);
  assert.match(sql, /'buyerStage'/i);
  for (const versionKey of ["promptVersion", "parserVersion", "retrievalVersion", "policyVersion", "schemaVersion", "evaluationVersion"]) {
    assert.match(sql, new RegExp(`'${versionKey}'`, "i"));
  }
  assert.match(sql, /historical/i);
  assert.doesNotMatch(sql, /update\s+public\.run_answers[\s\S]+measurement_context_json/i);
});

test("service-only measurement facts exclude raw customer content", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create or replace view public\.measurement_observation_facts/i);
  assert.match(sql, /review_status\s*=\s*'verified'/i);
  assert.match(sql, /question_identity_hash/i);
  assert.match(sql, /measurement_context_hash/i);
  assert.match(sql, /digest\(/i);
  assert.match(sql, /brand_present/i);
  assert.match(sql, /citation_count/i);

  const factView = sql.match(/create or replace view public\.measurement_observation_facts[\s\S]*?;\n\n/i)?.[0] || "";
  assert.ok(factView, "measurement_observation_facts definition must be inspectable");
  assert.doesNotMatch(factView, /answer_text|raw_json|citations_json|prompt_text|review_note|organization.*name|website/i);
  assert.match(sql, /revoke all on public\.measurement_observation_facts from public, anon, authenticated/i);
  assert.match(sql, /grant select on public\.measurement_observation_facts to service_role/i);
});

test("benchmark candidates are consent gated anonymized and suppressed below ten organizations", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create or replace view public\.benchmark_protocol_candidates/i);
  assert.match(sql, /data_governance_settings/i);
  assert.match(sql, /benchmark_eligible\s*=\s*true/i);
  assert.match(sql, /benchmark_consent_at\s+is\s+not\s+null/i);
  assert.match(sql, /benchmark_consent_at\s*<=\s*/i);
  assert.match(sql, /anonymization_required\s*=\s*true/i);
  assert.match(sql, /count\s*\(\s*distinct\s+organization_id\s*\)\s*>=\s*10/i);
  assert.match(sql, /question_matrix_hash/i);
  assert.match(sql, /measurement_context_hash/i);
  assert.match(sql, /observed_brand_presence_rate/i);
  assert.match(sql, /citation_bearing_answer_rate/i);

  const benchmarkView = sql.match(/create or replace view public\.benchmark_protocol_candidates[\s\S]*?;\n\n/i)?.[0] || "";
  assert.ok(benchmarkView, "benchmark_protocol_candidates definition must be inspectable");
  assert.doesNotMatch(benchmarkView, /organization_id\s*,|project_id\s*,|run_id\s*,|run_answer_id\s*,|prompt_text|answer_text|citations_json|raw_json|website/i);
  assert.match(sql, /revoke all on public\.benchmark_protocol_candidates from public, anon, authenticated/i);
  assert.match(sql, /grant select on public\.benchmark_protocol_candidates to service_role/i);
});

test("measurement moat migration seeds no benchmark or customer facts", async () => {
  const sql = await text(migrationPath);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.(measurement_observation|benchmark_protocol)/i);
  assert.doesNotMatch(sql, /market share|customer demand|category leadership|revenue benchmark/i);
});