import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260915000500_remove_redundant_single_tenant_fks.sql",
  import.meta.url,
);

const redundantConstraints = [
  ["prompts", "prompts_category_id_fkey"],
  ["runs", "runs_category_id_fkey"],
  ["run_answers", "run_answers_run_id_fkey"],
  ["run_answers", "run_answers_prompt_id_fkey"],
  ["citations", "citations_run_answer_id_fkey"],
  ["citations", "citations_source_id_fkey"],
  ["source_maps", "source_maps_category_id_fkey"],
  ["source_map_entries", "source_map_entries_source_map_id_fkey"],
  ["source_map_entries", "source_map_entries_source_id_fkey"],
  ["placements", "placements_source_id_fkey"],
  ["placement_events", "placement_events_placement_id_fkey"],
  ["run_attempts", "run_attempts_run_id_fkey"],
  ["run_attempts", "run_attempts_prompt_id_fkey"],
  ["answer_brand_mentions", "answer_brand_mentions_run_answer_id_fkey"],
  ["source_brand_mentions", "source_brand_mentions_source_id_fkey"],
  ["source_observations", "source_observations_source_id_fkey"],
  ["source_observations", "source_observations_run_answer_id_fkey"],
  ["source_observations", "source_observations_prompt_id_fkey"],
];

test("F01 keeps one canonical tenant-safe relationship for every hardened link", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected a migration removing redundant single-column foreign keys");

  for (const [table, constraint] of redundantConstraints) {
    assert.match(
      migration,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+drop\\s+constraint\\s+if\\s+exists\\s+${constraint}`, "i"),
      `${constraint} should be removed so PostgREST sees only the tenant-safe composite relationship`,
    );
  }

  assert.equal(redundantConstraints.length, 18);
});
