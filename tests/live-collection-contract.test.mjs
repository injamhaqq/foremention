import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("live collection is tenant-revalidated, idempotent, cost-capped and background-only", async () => {
  const [route, job, rest, migration] = await Promise.all([
    text("app/api/runs/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/supabase-rest.ts"),
    text("supabase/migrations/20260728000100_live_collection_hardening.sql"),
  ]);
  assert.match(route, /idempotency-key/);
  assert.match(route, /reserve_run_budget/);
  assert.match(route, /INNGEST_SIGNING_KEY/);
  assert.match(route, /data: \{ runId, organizationId: context\.organizationId \}/);
  assert.doesNotMatch(route, /data: \{[^}]*prompts/s);
  assert.match(job, /idempotency: "event\.data\.runId"/);
  assert.match(job, /key: "event\.data\.organizationId"/);
  assert.match(job, /cancelOn/);
  assert.match(job, /run_prompt_selections/);
  assert.match(job, /run_attempts/);
  assert.match(job, /ai_cost_events/);
  assert.match(job, /recordedRunCost/);
  assert.match(job, /cost_source: "estimated"/);
  assert.doesNotMatch(job, /source_maps/);
  assert.match(rest, /options\.serviceRole && !serviceRoleKey/);
  assert.doesNotMatch(rest, /serviceRoleKey \|\| anonKey/);
  assert.match(migration, /run_prompt_selections_select_member/);
  assert.match(migration, /runs_organization_idempotency_idx/);
  assert.match(migration, /monthly_ai_spend_cap_usd/);
  assert.match(migration, /max_concurrent_runs/);
  assert.match(migration, /status not in \('failed','cancelled'\) or started_at is not null/);
  assert.match(migration, /source_observations_observation_key_idx/);
  assert.doesNotMatch(migration, /delete from public\.source_observations/);
});

test("successful empty Supabase write responses are not treated as failures", async () => {
  const source = await readFile(new URL("../lib/supabase-rest.ts", import.meta.url), "utf8");
  assert.match(source, /const responseText = await response\.text\(\)/);
  assert.match(source, /if \(!responseText\.trim\(\)\) return undefined as T/);
});

test("new Supabase API keys stay in the apikey header instead of impersonating a user JWT", async () => {
  const source = await readFile(new URL("../lib/supabase-rest.ts", import.meta.url), "utf8");
  assert.match(source, /value\.startsWith\("sb_publishable_"\)/);
  assert.match(source, /value\.startsWith\("sb_secret_"\)/);
  assert.match(source, /options\.token[\s\S]*Bearer \$\{options\.token\}/);
  assert.match(source, /isOpaqueApiKey\(key\) \? null/);
});

test("the server-only Supabase role can execute trusted background collection", async () => {
  const migration = await text("supabase/migrations/20260729000200_service_role_background_permissions.sql");
  assert.match(migration, /grant usage on schema public to service_role/i);
  assert.match(migration, /grant select, insert, update, delete on all tables in schema public to service_role/i);
  assert.match(migration, /grant execute on all functions in schema public to service_role/i);
  assert.match(migration, /alter default privileges in schema public/i);
  assert.doesNotMatch(migration, /grant .* to anon/i);
});

test("only reviewed persisted observations create a truthful Source Map", async () => {
  const [review, generator, loader] = await Promise.all([
    text("app/api/runs/[id]/review/route.ts"),
    text("lib/source-map-generation.ts"),
    text("lib/data.ts"),
  ]);
  assert.match(review, /run\.status !== "review"/);
  assert.match(review, /review_status: "verified"/);
  assert.match(review, /run_answers[\s\S]*serviceRole: true/);
  assert.match(generator, /review_status=eq\.verified/);
  assert.match(generator, /status: "published"/);
  assert.match(generator, /influence: "unknown"/);
  assert.match(generator, /feasibility: "unknown"/);
  assert.match(loader, /status=eq\.published/);
});

test("customer mutations explicitly enforce workspace roles and organization filters", async () => {
  const [runRoute, promptRoute, reviewRoute] = await Promise.all([
    text("app/api/runs/route.ts"),
    text("app/api/prompts/route.ts"),
    text("app/api/runs/[id]/review/route.ts"),
  ]);
  for (const source of [runRoute, promptRoute, reviewRoute]) {
    assert.match(source, /getPrimaryWorkspaceRole/);
    assert.match(source, /organization_id=eq\.\$\{/);
    assert.match(source, /role === "viewer"/);
    assert.match(source, /isTrustedMutationOrigin/);
  }
});

test("Groq Compound is a first-class, citation-preserving provider", async () => {
  const [adapter, registry, data, route, sourceMap] = await Promise.all([
    text("lib/providers/groq.ts"),
    text("lib/providers/index.ts"),
    text("lib/data.ts"),
    text("app/api/runs/route.ts"),
    text("lib/source-map-generation.ts"),
  ]);
  assert.match(adapter, /groq\/compound-mini|process\.env\.GROQ_MODEL/);
  assert.match(adapter, /enabled_tools: \["web_search"\]/);
  assert.match(adapter, /executed_tools/);
  assert.match(adapter, /search_results/);
  assert.doesNotMatch(adapter, /extractUrls/);
  assert.match(registry, /groqAdapter/);
  assert.match(data, /Groq Compound/);
  assert.match(route, /"groq"/);
  assert.match(sourceMap, /groq: "Groq Compound"/);
});
