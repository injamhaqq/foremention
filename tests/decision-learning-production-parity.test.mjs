import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("change verification uses neutral observed-direction states", async () => {
  const source = await text("lib/change-verification.ts");
  for (const state of ["HIGHER_OBSERVED", "LOWER_OBSERVED", "MIXED_OBSERVED", "NO_DIRECTIONAL_CHANGE", "INSUFFICIENT_EVIDENCE"]) {
    assert.match(source, new RegExp(state));
  }
  assert.doesNotMatch(source, /\bIMPROVED\b|\bWORSENED\b|\bUNCHANGED\b/);
});

test("forward parity migration fixes stale run provenance and neutralizes persisted learning semantics", async () => {
  const migration = await text("supabase/migrations/20260915000400_decision_learning_production_parity.sql");
  assert.match(migration, /join\s+public\.runs\s+as\s+run/i);
  assert.doesNotMatch(migration, /collection_runs/i);
  assert.match(migration, /HIGHER_OBSERVED/);
  assert.match(migration, /LOWER_OBSERVED/);
  assert.match(migration, /MIXED_OBSERVED/);
  assert.match(migration, /NO_DIRECTIONAL_CHANGE/);
  assert.match(migration, /higher_observed_count/i);
  assert.match(migration, /lower_observed_count/i);
  assert.ok((migration.match(/\(select\s+auth\.uid\(\)\)/gi) ?? []).length >= 10);
});

test("Next Best Change API reads neutral learning counters", async () => {
  const route = await text("app/api/next-best-change/route.ts");
  assert.match(route, /higher_observed_count/);
  assert.match(route, /lower_observed_count/);
  assert.match(route, /mixed_observed_count/);
  assert.match(route, /no_directional_change_count/);
  assert.doesNotMatch(route, /improved_count|worsened_count|unchanged_count/);
});
