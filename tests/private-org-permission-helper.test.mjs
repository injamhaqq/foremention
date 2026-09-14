import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260915000100_private_org_permission_helper.sql",
  import.meta.url,
);

const policyNames = [
  "audit_events_owner_select",
  "data_requests_governed_update",
  "data_requests_select",
  "data_governance_owner_write",
  "data_governance_select",
  "org_domains_select",
  "permission_overrides_select",
  "org_security_owner_write",
  "org_security_select",
  "scim_connections_owner_select",
  "service_accounts_owner_select",
];

test("organization permission helper is removed from the exposed public RPC surface", async () => {
  const migration = await readFile(migrationUrl, "utf8").catch(() => null);
  assert.ok(migration, "expected migration that moves has_org_permission out of public");

  assert.match(migration, /create\s+schema\s+if\s+not\s+exists\s+private/i);
  assert.match(
    migration,
    /create\s+or\s+replace\s+function\s+private\.has_org_permission\s*\(\s*check_org_id\s+uuid,\s*requested_permission\s+text\s*\)/i,
  );
  assert.match(migration, /security\s+definer/i);
  assert.match(migration, /set\s+search_path\s*=\s*''/i);

  for (const policyName of policyNames) {
    assert.match(
      migration,
      new RegExp(`create\\s+policy\\s+"?${policyName}"?[\\s\\S]+?private\\.has_org_permission`, "i"),
      `${policyName} must call the private helper`,
    );
  }

  assert.match(
    migration,
    /revoke\s+all\s+on\s+function\s+private\.has_org_permission\s*\(\s*uuid,\s*text\s*\)\s+from\s+public,\s*anon,\s*authenticated/i,
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+private\.has_org_permission\s*\(\s*uuid,\s*text\s*\)\s+to\s+service_role/i,
  );
  assert.match(
    migration,
    /drop\s+function\s+public\.has_org_permission\s*\(\s*uuid,\s*text\s*\)/i,
  );
});
