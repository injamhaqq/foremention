import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("GDPR deletion remains owner-confirmed, delayed, auditable, and tenant-scoped", () => {
  const migration = readFileSync("supabase/migrations/20260802001000_gdpr_data_deletion.sql", "utf8");
  const route = readFileSync("app/api/account/deletion/route.ts", "utf8");
  const ui = readFileSync("components/account-lifecycle.tsx", "utf8");
  assert.match(migration, /scheduled_for > now\(\)/);
  assert.match(migration, /role = 'owner'/);
  assert.match(migration, /data_deletion_receipts/);
  assert.match(migration, /delete from public\.organizations where id = deletion_request\.organization_id/);
  assert.match(migration, /revoke all on function .* from public, anon, authenticated/);
  assert.match(route, /isRecentAccessToken/);
  assert.match(route, /body\.confirmation !== `DELETE \$\{context\.organizationName\}`/);
  assert.match(route, /exportAcknowledged !== true/);
  assert.match(route, /foremention\/run\.cancelled/);
  assert.match(route, /revokeAllSupabaseSessions/);
  assert.match(route, /sendProductAlertEmail/);
  assert.match(ui, /Download full workspace ZIP first/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/);
});

test("the migration defines deletion capability without executing a deletion during migration", () => {
  const migration = readFileSync("supabase/migrations/20260802001000_gdpr_data_deletion.sql", "utf8");
  const outsideFunction = migration.split("create or replace function")[0];
  assert.doesNotMatch(outsideFunction, /delete from public\.organizations/i);
});
