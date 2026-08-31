import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const governanceMigration = "supabase/migrations/20260830000800_enterprise_security_governance.sql";
const auditHardeningMigration = "supabase/migrations/20260830000900_audit_log_hardening.sql";

test("enterprise audit storage is append-only for application actors without blocking tenant deletion cascades", async () => {
  const [governance, hardening] = await Promise.all([
    read(governanceMigration),
    read(auditHardeningMigration),
  ]);

  assert.match(governance, /revoke all on public\.audit_events from anon, authenticated/i);
  assert.match(governance, /grant select on public\.audit_events to authenticated/i);
  assert.match(governance, /grant select, insert on public\.audit_events to service_role/i);
  assert.doesNotMatch(governance, /grant (?:update|delete)[^;]*public\.audit_events to service_role/i);

  assert.match(hardening, /drop trigger if exists audit_events_immutable_delete on public\.audit_events/i);
  assert.doesNotMatch(hardening, /create trigger audit_events_immutable_delete/i);
  assert.match(hardening, /tenant deletion cascade/i);
});

test("legacy audit_logs loses analyst mutation rights but keeps member read and trusted append", async () => {
  const sql = await read(auditHardeningMigration);
  assert.match(sql, /drop policy if exists "audit_logs_write_analyst" on public\.audit_logs/i);
  assert.match(sql, /revoke insert, update, delete on public\.audit_logs from authenticated/i);
  assert.match(sql, /grant select on public\.audit_logs to authenticated/i);
  assert.match(sql, /grant select, insert on public\.audit_logs to service_role/i);
  assert.doesNotMatch(sql, /grant (?:update|delete)[^;]*public\.audit_logs to service_role/i);
  assert.match(sql, /before update on public\.audit_logs/i);
  assert.doesNotMatch(sql, /before delete on public\.audit_logs/i);
});

test("role migration order makes admin valid before retention policies can use it", async () => {
  const adminMigrationPath = "supabase/migrations/20260729000100_collaboration_lifecycle_alerts.sql";
  const retentionMigrationPath = "supabase/migrations/20260829000100_retention_loop_v1.sql";
  const [adminMigration, retention] = await Promise.all([
    read(adminMigrationPath),
    read(retentionMigrationPath),
  ]);
  assert.ok(adminMigrationPath < retentionMigrationPath, "admin enum migration must sort before retention policies");
  assert.match(adminMigration, /add value if not exists 'admin'/i);
  assert.match(retention, /'owner','admin'/i);
});

test("workspace deletion remains owner-controlled and enterprise audit hardening does not replace it", async () => {
  const deletion = await read("supabase/migrations/20260802001000_gdpr_data_deletion.sql");
  assert.match(deletion, /role = 'owner'/i);
  assert.match(deletion, /interval '7 days'/i);
  assert.match(deletion, /execute_foremention_account_deletion/i);
  assert.match(deletion, /revoke all on function public\.execute_foremention_account_deletion/i);
  assert.match(deletion, /grant execute on function public\.execute_foremention_account_deletion[\s\S]*to service_role/i);
});

test("team administration derives tenant server-side and protects the last owner", async () => {
  const route = await read("app/api/team/members/[id]/route.ts");
  assert.match(route, /loadWorkspaceContext\(viewer\)/);
  assert.match(route, /role !== "owner"/);
  assert.match(route, /last owner cannot be removed/i);
  assert.match(route, /Invalid request origin/i);
  assert.doesNotMatch(route, /body\.organizationId|body\.organization_id/);
});

test("SSO remains fail-closed until configuration and domain allowlisting are real", async () => {
  const sso = await read("lib/enterprise-sso.ts");
  assert.match(sso, /SSO is not configured\./);
  assert.match(sso, /configuredSsoDomains\(\)\.length > 0/);
  assert.match(sso, /FOREMENTION_SSO_DOMAINS/);
  assert.match(sso, /Domain is not configured for enterprise SSO/i);
});

test("data governance fails closed on benchmark use, training, residency and enterprise automation", async () => {
  const [sql, governance, trust] = await Promise.all([
    read(governanceMigration),
    read("lib/enterprise-governance.ts"),
    read("lib/trust-capabilities.ts"),
  ]);
  assert.match(sql, /benchmark_eligible boolean not null default false/i);
  assert.match(sql, /not benchmark_eligible or benchmark_consent_at is not null/i);
  assert.match(sql, /customer_content_training_allowed boolean not null default false/i);
  assert.match(sql, /check \(customer_content_training_allowed = false\)/i);
  assert.match(governance, /dataResidencyRegion: null/);
  assert.match(governance, /scim: "unconfigured"/);
  assert.match(governance, /serviceAccounts: "disabled"/);
  assert.match(trust, /name: "Data residency guarantee"[\s\S]*status: "unavailable"/i);
  assert.match(trust, /name: "SCIM"[\s\S]*status: "unavailable"/i);
});

test("security-sensitive enterprise tables are RLS protected and never exposed to anon", async () => {
  const sql = await read(governanceMigration);
  for (const relation of [
    "organization_security_settings",
    "organization_domains",
    "organization_permission_overrides",
    "service_accounts",
    "scim_connections",
    "audit_events",
    "data_governance_settings",
    "data_governance_requests",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on public\\.${relation} from anon`, "i"));
  }
});
