import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260915000500_design_partner_trigger_execute_hardening.sql",
  import.meta.url,
);

test("design-partner validation trigger is not directly executable by API roles", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected a migration that hardens the design-partner validation trigger");

  assert.match(
    migration,
    /revoke\s+execute\s+on\s+function\s+public\.validate_design_partner_execution_cycle\(\)\s+from\s+public,\s*anon,\s*authenticated/i,
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.validate_design_partner_execution_cycle\(\)\s+to\s+service_role/i,
  );
});
