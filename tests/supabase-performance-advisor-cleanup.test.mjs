import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260915000300_performance_advisor_cleanup.sql",
  import.meta.url,
);

test("RLS auth helpers are init-plan safe and duplicate run index is removed", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected performance advisor cleanup migration");

  const policyContracts = [
    "customer_success_reviews_insert_analyst",
    "data_requests_select",
    "data_requests_insert",
    "change_specifications_insert_analyst",
    "change_specifications_delete_creator_draft",
    "change_execution_assets_write_analyst",
  ];

  for (const policyName of policyContracts) {
    assert.match(
      migration,
      new RegExp(`alter\\s+policy\\s+${policyName}\\s+on\\s+public\\.`, "i"),
      `${policyName} must be altered in place so command/role semantics are preserved`,
    );
  }

  assert.ok(
    (migration.match(/\(select\s+auth\.uid\(\)\)/gi) ?? []).length >= 6,
    "all six advisor-reported auth.uid() calls must use a single init plan",
  );
  assert.match(
    migration,
    /private\.has_org_permission\s*\(\s*organization_id\s*,\s*'security\.read'::text\s*\)/i,
    "data governance select policy must use the non-exposed permission helper",
  );
  assert.match(
    migration,
    /drop\s+index\s+if\s+exists\s+public\.ai_cost_events_run_id_fk_idx/i,
    "drop only the redundant auto-generated run_id index",
  );
});
