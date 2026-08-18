import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260818000200_security_performance_advisor_hardening.sql";

test("exposed SECURITY DEFINER helpers move behind a private-schema boundary", async () => {
  const migration = await text(migrationPath);

  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /alter function public\.complete_onboarding\(jsonb\) set schema private/i);
  assert.match(migration, /alter function public\.has_org_role\(uuid, public\.organization_role\[\]\) set schema private/i);
  assert.match(migration, /alter function public\.is_org_member\(uuid\) set schema private/i);
  assert.match(migration, /create or replace function public\.complete_onboarding\(payload jsonb\)[\s\S]*security invoker/i);
  assert.match(migration, /create or replace function public\.has_org_role\([\s\S]*security invoker/i);
  assert.match(migration, /create or replace function public\.is_org_member\([\s\S]*security invoker/i);
  assert.match(migration, /revoke all on schema private from public, anon/i);
  assert.match(migration, /grant usage on schema private to authenticated/i);
});

test("material unindexed foreign keys receive targeted indexes", async () => {
  const migration = await text(migrationPath);
  for (const expected of [
    "ai_cost_events_run_attempt_idx",
    "ai_cost_events_run_idx",
    "invitations_invited_by_idx",
    "placement_events_actor_idx",
    "resolution_asset_evidence_evidence_item_idx",
    "resolution_assets_approved_by_idx",
    "resolution_follow_ups_rerun_idx",
    "run_attempts_run_idx",
    "source_observations_source_idx",
    "source_snapshot_observations_source_observation_idx",
  ]) {
    assert.match(migration, new RegExp(`create index if not exists ${expected}`, "i"));
  }
});

test("migration validation is a release gate, not a prose assertion", async () => {
  const [workflow, verifier] = await Promise.all([
    text(".github/workflows/ci.yml"),
    text("scripts/verify-company-migrations.sql"),
  ]);

  assert.match(workflow, /supabase\/setup-cli/i);
  assert.match(workflow, /supabase start/i);
  assert.match(workflow, /supabase db reset/i);
  assert.match(workflow, /verify-company-migrations\.sql/i);
  assert.match(verifier, /company_ceo_scorecard/i);
  assert.match(verifier, /company_customer_value_scorecard/i);
  assert.match(verifier, /private\.complete_onboarding/i);
  assert.match(verifier, /prosecdef = false/i);
});