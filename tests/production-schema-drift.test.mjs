import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("scheduled evidence-change notifications use the deployed notification kind contract", async () => {
  const source = await read("lib/jobs/inngest.ts");

  assert.match(source, /event_key:\s*`\$\{change\.kind\}:\$\{run\.id\}`,[\s\S]*?kind:\s*"workspace"/);
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
