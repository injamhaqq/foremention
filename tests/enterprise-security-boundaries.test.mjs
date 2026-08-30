import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const hardeningPath = "supabase/migrations/20260830000500_enterprise_fail_closed_hardening.sql";

test("domain verification state is readable but not directly mutable by authenticated clients", async () => {
  const sql = await read(hardeningPath);
  assert.match(sql, /drop policy if exists "org_domains_owner_write" on public\.organization_domains/i);
  assert.match(sql, /revoke insert, update, delete on public\.organization_domains from authenticated/i);
  assert.match(sql, /grant select on public\.organization_domains to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on public\.organization_domains to service_role/i);
});

test("unavailable SCIM and staged service accounts remain database-disabled", async () => {
  const sql = await read(hardeningPath);
  assert.match(sql, /organization_security_scim_disabled_check/i);
  assert.match(sql, /check \(scim_enabled = false\)/i);
  assert.match(sql, /organization_security_service_accounts_disabled_check/i);
  assert.match(sql, /check \(service_accounts_enabled = false\)/i);
});

test("deletion governance requests cannot be administered through export permission", async () => {
  const sql = await read(hardeningPath);
  assert.match(sql, /drop policy if exists "data_requests_owner_update" on public\.data_governance_requests/i);
  assert.match(sql, /request_type = 'deletion'[\s\S]*data\.delete/i);
  assert.match(sql, /request_type <> 'deletion'[\s\S]*data\.export/i);
});

test("enterprise settings stay tenant scoped even when external features are disabled", async () => {
  const sql = await read(hardeningPath);
  assert.match(sql, /organization_security_settings/i);
  assert.doesNotMatch(sql, /grant all on public\.organization_security_settings to authenticated/i);
});
