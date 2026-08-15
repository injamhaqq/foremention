import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("reviewed evidence-change notifications use the deployed notification kind contract", async () => {
  const source = await read("lib/reviewed-change-notifications.ts");

  assert.match(source, /assessWorkspaceRunPairComparability/);
  assert.match(source, /event_key:\s*change\.eventKey,[\s\S]*?kind:\s*"workspace"/);
  assert.match(source, /reviewed_change:/);
});

test("the seeded demo never labels fictional observations as real customer evidence", async () => {
  const overview = await read("app/app/page.tsx");

  assert.match(overview, /viewer\.mode === "demo"[\s\S]*?fictional sample observations/);
  assert.match(overview, /viewer\.mode === "demo"[\s\S]*?fictional sample answers/);
  assert.doesNotMatch(overview, /Across \$\{latest\.answers\} real answers/);
});

test("production hardening removes public RPC execution without breaking authenticated workflows", async () => {
  const migration = await read("supabase/migrations/20260810142217_production_drift_hardening.sql");

  for (const column of [
    "content_signature",
    "verification_status",
    "weekly_digest_enabled",
    "public_report_enabled",
  ]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`, "i"));
  }

  for (const table of [
    "verified_claim_evidence",
    "application_email_deliveries",
    "workspace_webhook_endpoints",
    "workspace_webhook_deliveries",
    "workspace_comments",
    "integration_credentials",
    "integration_activity_deliveries",
    "data_deletion_receipts",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }

  assert.match(migration, /create or replace function public\.execute_foremention_account_deletion/i);
  assert.match(migration, /extensions\.digest\(deletion_request\.organization_id::text, 'sha256'\)/i);
  assert.match(migration, /extensions\.digest\(p_requested_by::text, 'sha256'\)/i);
  assert.match(migration, /revoke all on function public\.execute_foremention_account_deletion\(uuid, uuid\) from public, anon, authenticated/i);

  for (const signature of [
    "complete_onboarding(jsonb)",
    "release_queued_run(uuid, uuid, text)",
    "reserve_run_budget(uuid, uuid, numeric)",
    "reserve_run_quota(uuid, integer, uuid)",
    "has_org_role(uuid, public.organization_role[])",
    "is_org_member(uuid)",
    "handle_new_user()",
    "rls_auto_enable()",
  ]) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${signature.replace(/[()[\].]/g, "\\$&")} from public`, "i"));
  }

  assert.match(migration, /grant execute on function public\.complete_onboarding\(jsonb\) to authenticated/i);
  assert.match(migration, /grant execute on function public\.is_org_member\(uuid\) to authenticated/i);
  assert.doesNotMatch(migration, /grant execute on function public\.handle_new_user\(\) to (anon|authenticated)/i);
  assert.doesNotMatch(migration, /grant execute on function public\.rls_auto_enable\(\) to (anon|authenticated)/i);
});

test("production drift reconciliation covers foreign keys without overlapping read policies", async () => {
  const migration = await read("supabase/migrations/20260810142520_production_drift_performance_cleanup.sql");

  for (const index of [
    "verified_claim_evidence_evidence_item_idx",
    "workspace_webhook_endpoints_created_by_idx",
    "workspace_comments_author_idx",
    "integration_activity_deliveries_integration_idx",
  ]) {
    assert.match(migration, new RegExp(`create index if not exists ${index}`, "i"));
  }

  assert.match(migration, /drop policy if exists "verified_claim_evidence_write_analyst"/i);
  assert.match(migration, /create policy "verified_claim_evidence_insert_analyst"[\s\S]*for insert to authenticated/i);
  assert.match(migration, /create policy "verified_claim_evidence_update_analyst"[\s\S]*for update to authenticated/i);
  assert.match(migration, /create policy "verified_claim_evidence_delete_analyst"[\s\S]*for delete to authenticated/i);

  assert.match(migration, /drop policy if exists "workspace_webhook_endpoints_write_admin"/i);
  assert.match(migration, /create policy "workspace_webhook_endpoints_insert_admin"[\s\S]*for insert to authenticated/i);
  assert.match(migration, /create policy "workspace_webhook_endpoints_update_admin"[\s\S]*for update to authenticated/i);
  assert.match(migration, /create policy "workspace_webhook_endpoints_delete_admin"[\s\S]*for delete to authenticated/i);
});

test("tenant-owned evidence and integration relationships cannot cross organizations", async () => {
  const migrationNames = await readdir(new URL("../supabase/migrations/", import.meta.url));
  const migrationName = migrationNames.find((name) => name.endsWith("_tenant_relation_integrity.sql"));

  assert.ok(migrationName, "tenant relation integrity migration is required");
  const migration = await read(`supabase/migrations/${migrationName}`);

  for (const constraint of [
    "verified_claims_org_project_fkey",
    "verified_claims_org_evidence_fkey",
    "evidence_items_org_project_fkey",
    "verified_claim_evidence_org_claim_fkey",
    "verified_claim_evidence_org_evidence_fkey",
    "workspace_webhook_deliveries_org_endpoint_fkey",
    "integration_activity_deliveries_org_integration_fkey",
  ]) {
    assert.match(migration, new RegExp(`add constraint ${constraint}`, "i"));
  }

  assert.match(migration, /foreign key \(organization_id, claim_id\)[\s\S]*references public\.verified_claims \(organization_id, id\)/i);
  assert.match(migration, /foreign key \(organization_id, evidence_item_id\)[\s\S]*references public\.evidence_items \(organization_id, id\)/i);
  assert.match(migration, /foreign key \(organization_id, endpoint_id\)[\s\S]*references public\.workspace_webhook_endpoints \(organization_id, id\)/i);
  assert.match(migration, /foreign key \(organization_id, integration_id\)[\s\S]*references public\.integrations \(organization_id, id\)/i);
});

test("deleting evidence clears only the optional evidence reference", async () => {
  const migrationNames = await readdir(new URL("../supabase/migrations/", import.meta.url));
  const migrationName = migrationNames.find((name) => name.endsWith("_verified_claim_evidence_delete_semantics.sql"));

  assert.ok(migrationName, "verified claim evidence delete-semantics migration is required");
  const migration = await read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /foreign key \(organization_id, evidence_item_id\)[\s\S]*on delete set null \(evidence_item_id\)/i);
  assert.doesNotMatch(migration, /on delete set null\s*;/i);
});
