import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260830113100_scale_unit_economics_observability.sql", import.meta.url), "utf8");
const groq = await readFile(new URL("../lib/providers/groq.ts", import.meta.url), "utf8");
const inngest = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
const canary = await readFile(new URL("../scripts/first-evidence-production-canary.mjs", import.meta.url), "utf8");

test("FinOps operational facts stay service-only and content-free", () => {
  assert.match(migration, /create or replace view public\.provider_attempt_operational_facts/);
  assert.match(migration, /revoke all on public\.provider_attempt_operational_facts from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.provider_attempt_operational_facts to service_role/);
  assert.match(migration, /attempt\.attempt_number > 1/);
  assert.match(migration, /entitlement\.package_key/);
  assert.match(migration, /billing\.state as billing_state/);

  for (const sensitiveColumn of ["prompt_text", "answer_text", "raw_response", "error_detail", "citation_text", "email"]) {
    assert.doesNotMatch(migration, new RegExp(`\\b${sensitiveColumn}\\b`, "i"));
  }
});

test("infrastructure COGS can only be sourced into a service-only verified ledger", () => {
  assert.match(migration, /create table if not exists public\.infrastructure_cost_allocations/);
  assert.match(migration, /allocation_method in \('direct_meter', 'provider_invoice', 'allocated'\)/);
  assert.match(migration, /source_ref_hash text not null/);
  assert.match(migration, /revoke all on public\.infrastructure_cost_allocations from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on public\.infrastructure_cost_allocations to service_role/);
});

test("Groq per-prompt reservation is not derived from the whole-run ceiling", () => {
  assert.match(groq, /estimatedPromptCost = GROQ_SPEND_LIMITS\.reservedCostPerPromptUsd/);
  assert.doesNotMatch(groq, /estimatedPromptCost = GROQ_SPEND_LIMITS\.maxRunCostUsd/);
});

test("collection execution keeps explicit global and tenant concurrency, timeouts, idempotency and cancellation", () => {
  assert.match(inngest, /idempotency: "event\.data\.runId"/);
  assert.match(inngest, /concurrency: \[\{ limit: 4 \}, \{ limit: 1, key: "event\.data\.organizationId" \}\]/);
  assert.match(inngest, /timeouts: \{ start: "5m", finish: "30m" \}/);
  assert.doesNotMatch(inngest, /timeouts: \{ start: "5m", finish: "10m" \}/);
  assert.match(inngest, /foremention\/run\.cancelled/);
  assert.match(inngest, /LIVE_COLLECTION_LIMITS\.providerTimeoutMs/);
});

test("authenticated first-evidence canary keeps the bounded twenty-minute polling timeout", () => {
  assert.match(
    canary,
    /Math\.max\(60_000, Math\.min\(Number\(process\.env\.FOREMENTION_ACCEPTANCE_CANARY_TIMEOUT_MS \|\| 1_200_000\), 1_200_000\)\)/,
  );
  assert.doesNotMatch(canary, /FOREMENTION_ACCEPTANCE_CANARY_TIMEOUT_MS \|\| 600_000\), 900_000/);
});
