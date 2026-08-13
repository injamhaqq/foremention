import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("production foreign-key advisor indexes are added without changing access policy", async () => {
  const migrations = await readdir(new URL("supabase/migrations/", root));
  const name = migrations.find((item) => item.endsWith("_foreign_key_performance_indexes.sql"));
  assert.ok(name, "foreign-key performance migration is required");

  const migration = await readFile(new URL(`supabase/migrations/${name}`, root), "utf8");
  for (const index of [
    "approvals_requested_by_idx",
    "citation_observations_run_answer_idx",
    "evidence_items_owner_idx",
    "notification_preferences_user_idx",
    "opportunities_owner_idx",
    "opportunity_scores_scored_by_idx",
    "organizations_created_by_idx",
    "outreach_actions_created_by_idx",
    "placements_created_by_idx",
    "prompt_versions_created_by_idx",
    "run_answers_prompt_idx",
    "runs_created_by_idx",
    "source_maps_created_by_idx",
    "source_observations_prompt_idx",
    "verified_claims_verified_by_idx",
  ]) {
    assert.match(migration, new RegExp(`create index if not exists ${index}`, "i"));
  }

  assert.doesNotMatch(migration, /drop\s+(index|policy|constraint|table)/i);
  assert.doesNotMatch(migration, /alter\s+table/i);
  assert.doesNotMatch(migration, /(grant|revoke)\s+/i);
});
