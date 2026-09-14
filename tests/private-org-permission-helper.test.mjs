import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260915000200_private_org_permission_helper.sql",
  import.meta.url,
);

test("organization permission helper is removed from the exposed public RPC surface", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected migration that moves has_org_permission out of public");

  assert.match(migration, /create\s+schema\s+if\s+not\s+exists\s+private/i);
  assert.match(
    migration,
    /alter\s+function\s+public\.has_org_permission\s*\(\s*uuid,\s*text\s*\)\s+set\s+schema\s+private/i,
    "move the existing function so PostgreSQL preserves all policy dependencies by function OID",
  );
  assert.match(
    migration,
    /revoke\s+all\s+on\s+schema\s+private\s+from\s+public,\s*anon/i,
  );
  assert.match(
    migration,
    /grant\s+usage\s+on\s+schema\s+private\s+to\s+authenticated,\s*service_role/i,
  );
  assert.match(
    migration,
    /revoke\s+all\s+on\s+function\s+private\.has_org_permission\s*\(\s*uuid,\s*text\s*\)\s+from\s+public,\s*anon/i,
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+private\.has_org_permission\s*\(\s*uuid,\s*text\s*\)\s+to\s+authenticated,\s*service_role/i,
    "RLS callers retain EXECUTE while the function is no longer in an exposed API schema",
  );
});
