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
  assert.doesNotMatch(adapter, /citation_options/);
  assert.match(registry, /groqAdapter/);
  assert.match(data, /Groq Compound/);
  assert.match(route, /"groq"/);
  assert.match(sourceMap, /groq: "Groq Compound"/);
});

test("Cloudflare Workers AI is a cost-capped answer-only comparison provider", async () => {
  const [adapter, types, registry, data, route, worker, sourceMap, config, prepare, launcher] = await Promise.all([
    text("lib/providers/cloudflare.ts"),
    text("lib/providers/types.ts"),
    text("lib/providers/index.ts"),
    text("lib/data.ts"),
    text("app/api/runs/route.ts"),
    text("worker/index.ts"),
    text("lib/source-map-generation.ts"),
    text("wrangler.jsonc"),
    text("scripts/prepare-worker-config.mjs"),
    text("components/run-launcher.tsx"),
  ]);
  assert.match(types, /"cloudflare"/);
  assert.match(adapter, /binding\.run\(model/);
  assert.match(adapter, /citations: \[\]/);
  assert.match(adapter, /grounded: false/);
  assert.match(adapter, /Do not invent citations, URLs/);
  assert.doesNotMatch(adapter, /extractUrls/);
  assert.doesNotMatch(adapter, /CLOUDFLARE_API_(?:KEY|TOKEN)/);
  assert.match(registry, /cloudflareAdapter/);
  assert.match(data, /Cloudflare Workers AI/);
  assert.match(data, /supportsCitations: false/);
  assert.match(route, /"cloudflare"/);
  assert.match(worker, /setCloudflareAiBinding\(env\.AI\)/);
  assert.match(sourceMap, /cloudflare: "Cloudflare Workers AI"/);
  assert.match(config, /"binding": "AI"/);
  assert.match(config, /@cf\/google\/gemma-4-26b-a4b-it/);
  assert.match(prepare, /config\.ai = \{ binding: "AI" \}/);
  assert.match(prepare, /CLOUDFLARE_INPUT_COST_PER_MILLION_USD/);
  assert.match(launcher, /answer comparison only; no returned web citations/);
});

test("OpenRouter uses an explicit GLM model and never fabricates citation evidence", async () => {
  const [adapter, types, registry, policy, data, route, sourceMap, config, prepare, launcher] = await Promise.all([
    text("lib/providers/openrouter.ts"),
    text("lib/providers/types.ts"),
    text("lib/providers/index.ts"),
    text("lib/collection-policy.ts"),
    text("lib/data.ts"),
    text("app/api/runs/route.ts"),
    text("lib/source-map-generation.ts"),
    text("wrangler.jsonc"),
    text("scripts/prepare-worker-config.mjs"),
    text("components/run-launcher.tsx"),
  ]);
  assert.match(types, /"openrouter"/);
  assert.match(adapter, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(adapter, /process\.env\.OPENROUTER_MODEL/);
  assert.match(adapter, /citations: \[\]/);
  assert.match(adapter, /grounded: false/);
  assert.match(adapter, /Do not invent citations, URLs/);
  assert.doesNotMatch(adapter, /extractUrls/);
  assert.doesNotMatch(adapter, /openrouter\/free/);
  assert.match(registry, /openRouterAdapter/);
  assert.match(policy, /openrouter: "OPENROUTER"/);
  assert.match(data, /OpenRouter · GLM 5\.2/);
  assert.match(data, /id: "openrouter"[\s\S]*supportsCitations: false/);
  assert.match(route, /"openrouter"/);
  assert.match(sourceMap, /openrouter: "OpenRouter"/);
  assert.match(config, /z-ai\/glm-5\.2/);
  assert.match(prepare, /OPENROUTER_INPUT_COST_PER_MILLION_USD/);
  assert.match(launcher, /answer comparison only; no returned web citations/);
});

test("optional model gateways use fixed official endpoints and truthful evidence handling", async () => {
  const [helper, zenmux, omnirouters, types, registry, policy, data, route, sourceMap, env] = await Promise.all([
    text("lib/providers/openai-compatible-gateway.ts"),
    text("lib/providers/zenmux.ts"),
    text("lib/providers/omnirouters.ts"),
    text("lib/providers/types.ts"),
    text("lib/providers/index.ts"),
    text("lib/collection-policy.ts"),
    text("lib/data.ts"),
    text("app/api/runs/route.ts"),
    text("lib/source-map-generation.ts"),
    text(".env.example"),
  ]);
  assert.match(zenmux, /https:\/\/zenmux\.ai\/api\/v1\/chat\/completions/);
  assert.match(zenmux, /max_completion_tokens/);
  assert.match(omnirouters, /https:\/\/omnirouters\.com\/v1\/chat\/completions/);
  assert.match(omnirouters, /max_tokens/);
  assert.match(helper, /Only structured URLs returned by the provider are recorded as citations/);
  assert.match(helper, /structuredCitations/);
  assert.doesNotMatch(helper, /extractUrls/);
  assert.doesNotMatch(helper, /process\.env\.(?:BASE_URL|ENDPOINT)/);
  assert.match(types, /"zenmux"/);
  assert.match(types, /"omnirouters"/);
  assert.match(registry, /zenMuxAdapter/);
  assert.match(registry, /omniRoutersAdapter/);
  assert.match(policy, /zenmux: "ZENMUX"/);
  assert.match(policy, /omnirouters: "OMNIROUTERS"/);
  assert.match(data, /id: "zenmux"[\s\S]*supportsCitations: false/);
  assert.match(data, /id: "omnirouters"[\s\S]*supportsCitations: false/);
  assert.match(route, /"zenmux"/);
  assert.match(route, /"omnirouters"/);
  assert.match(sourceMap, /zenmux: "ZenMux"/);
  assert.match(sourceMap, /omnirouters: "OmniRouters"/);
  for (const name of [
    "ZENMUX_API_KEY",
    "ZENMUX_MODEL",
    "ZENMUX_INPUT_COST_PER_MILLION_USD",
    "OMNIROUTERS_API_KEY",
    "OMNIROUTERS_MODEL",
    "OMNIROUTERS_INPUT_COST_PER_MILLION_USD",
  ]) {
    assert.match(env, new RegExp(`${name}=`));
  }
});

test("source observation upserts use a non-partial unique index", async () => {
  const migration = await text("supabase/migrations/20260729000300_source_observation_upsert_fix.sql");
  assert.match(migration, /create unique index source_observations_observation_key_idx/i);
  assert.match(migration, /source_observations\s*\(observation_key\)/i);
  assert.doesNotMatch(migration, /where\s+observation_key\s+is\s+not\s+null/i);
});

test("provider requests and persistence are separate durable steps", async () => {
  const workflow = await text("lib/jobs/inngest.ts");
  assert.match(workflow, /step\.run\(`collect-\$\{providerId\}-\$\{prompt\.prompt_key\}`/);
  assert.match(workflow, /step\.run\(\s*`persist-\$\{providerId\}-\$\{prompt\.prompt_key\}`/);
});

test("citation persistence is batched below Worker subrequest ceilings", async () => {
  const workflow = await text("lib/jobs/inngest.ts");
  assert.match(workflow, /body: uniqueCitations\.map/);
  assert.match(workflow, /body: persistedCitations\.map/);
  const citationCollectionLoop = workflow.match(
    /for \(const \[index, citation\][\s\S]*?\n  }\n\n  if \(!uniqueCitations\.length\)/,
  )?.[0];
  assert.ok(citationCollectionLoop);
  assert.doesNotMatch(citationCollectionLoop, /await /);
});

test("credential presence is separated from proven provider health", async () => {
  const [launcher, data] = await Promise.all([text("components/run-launcher.tsx"), text("lib/data.ts")]);
  assert.match(launcher, /Configured · production run not yet proven/);
  assert.match(launcher, /Proven available/);
  assert.match(launcher, /Latest attempt/);
  assert.match(data, /health: ProviderHealth/);
  assert.match(data, /latest\?\.status === "complete"/);
  assert.doesNotMatch(launcher, /provider\.configured \? "Connected"/);
});
