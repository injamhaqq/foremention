import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260914000400_security_definer_execute_hardening.sql",
  import.meta.url,
);

const triggerFunctions = [
  "capture_opportunity_ownership_outcome_event",
  "capture_resolution_evidence_outcome_event",
  "capture_resolution_follow_up_outcome_event",
  "capture_resolution_outcome_event",
];

test("SECURITY DEFINER helpers expose only the execution roles they require", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected a migration that hardens SECURITY DEFINER execute grants");

  for (const functionName of triggerFunctions) {
    assert.match(
      migration,
      new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${functionName}\\(\\)\\s+from\\s+public,\\s*anon,\\s*authenticated`, "i"),
      `${functionName} must not be directly executable by public API roles`,
    );
    assert.match(
      migration,
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${functionName}\\(\\)\\s+to\\s+service_role`, "i"),
      `${functionName} should retain the privileged service role grant`,
    );
  }

  assert.match(
    migration,
    /revoke\s+execute\s+on\s+function\s+public\.has_org_permission\(uuid,\s*text\)\s+from\s+public,\s*anon/i,
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.has_org_permission\(uuid,\s*text\)\s+to\s+authenticated,\s*service_role/i,
  );
});
