import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const migrationPath = "supabase/migrations/20260904000100_acquisition_research_provenance.sql";

test("acquisition research persists provenance with deterministic company dedupe", async () => {
  const migration = await text(migrationPath);

  assert.match(migration, /add column if not exists canonical_company_key text/i);
  assert.match(migration, /unique index if not exists commercial_accounts_canonical_company_key_uidx/i);
  assert.match(migration, /create table if not exists public\.acquisition_research_runs/i);
  assert.match(migration, /run_key text not null unique/i);
  assert.match(migration, /qualification_score smallint not null/i);
  assert.match(migration, /score_breakdown jsonb not null/i);
  assert.match(migration, /why_now text/i);
  assert.match(migration, /disqualifiers text\[\]/i);
  assert.match(migration, /create table if not exists public\.acquisition_research_evidence/i);
  assert.match(migration, /source_url text not null/i);
  assert.match(migration, /retrieved_at timestamptz not null/i);
  assert.match(migration, /confidence smallint not null/i);
  assert.match(migration, /unique \(research_run_id, source_url, evidence_key\)/i);
});

test("shadow eligibility fails closed for missing or stale provenance", async () => {
  const migration = await text(migrationPath);

  assert.match(migration, /create or replace view public\.acquisition_shadow_qualified_candidates/i);
  assert.match(migration, /r\.qualified_shadow = true/i);
  assert.match(migration, /r\.qualification_score >= 75/i);
  assert.match(migration, /cardinality\(r\.disqualifiers\) = 0/i);
  assert.match(migration, /r\.why_now is not null/i);
  assert.match(migration, /e\.retrieved_at >= now\(\) - interval '30 days'/i);
  assert.match(migration, /join public\.acquisition_research_evidence/i);
});

test("acquisition research remains service-only and cannot promote commercial truth", async () => {
  const migration = await text(migrationPath);

  for (const table of ["acquisition_research_runs", "acquisition_research_evidence"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }

  assert.match(migration, /revoke all on table public\.acquisition_research_runs, public\.acquisition_research_evidence from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.acquisition_research_runs, public\.acquisition_research_evidence to service_role/i);

  assert.doesNotMatch(migration, /insert\s+into\s+public\.commercial_events/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.commercial_opportunities/i);
  assert.doesNotMatch(migration, /update\s+public\.commercial_accounts/i);
  assert.doesNotMatch(migration, /outreach_sent/i);
});
