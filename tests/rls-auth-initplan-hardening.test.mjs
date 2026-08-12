import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260813023000_rls_auth_initplan_hardening.sql",
  import.meta.url,
);

test("RLS self checks use statement-level auth.uid initplans", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  const authCalls = sql.match(/auth\.uid\(\)/g) ?? [];
  const optimizedCalls = sql.match(/\(select auth\.uid\(\)\)/g) ?? [];

  assert.ok(authCalls.length >= 10, "expected the hardening migration to cover all targeted self checks");
  assert.equal(
    optimizedCalls.length,
    authCalls.length,
    "every auth.uid() call in the hardening migration must be wrapped in a scalar select",
  );

  for (const policy of [
    "account_deletion_requests_select_owner",
    "notification_preferences_select_self",
    "notification_preferences_write_self",
    "notifications_select_self",
    "notifications_update_self",
    "members_insert_owner",
    "organizations_insert_creator",
    "profiles_select_self",
    "profiles_update_self",
    "resolution_assets_insert_analyst",
    "resolution_follow_ups_insert_analyst",
    "resolution_follow_ups_update_analyst",
  ]) {
    assert.match(sql, new RegExp(`alter policy ${policy}\\b`));
  }
});
