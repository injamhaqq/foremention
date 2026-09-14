import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260914000200_foundation_budget_alignment.sql", import.meta.url);

test("Foundation entitlement defaults reserve the full 20-observation monthly allowance", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected a forward migration for the Foundation budget alignment");
  assert.match(migration, /monthly_ai_spend_cap_usd\s+set default\s+2\.00/i);
  assert.match(migration, /plan\s*=\s*'free_beta'/i);
  assert.match(migration, /monthly_ai_spend_cap_usd\s*=\s*1\.00/i);
  assert.match(migration, /set\s+monthly_ai_spend_cap_usd\s*=\s*2\.00/i);
});
