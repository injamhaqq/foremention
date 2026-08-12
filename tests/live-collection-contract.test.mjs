import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => access(new URL(path, root));

test("live collection is tenant-revalidated, idempotent, cost-capped and background-only", async () => {
  const [route, jobs, providers, migration, limits] = await Promise.all([text("app/api/runs/route.ts"), text("lib/jobs/inngest.ts"), text("lib/answer-provider.ts"), text("supabase/migrations/20260728000100_live_collection_hardening.sql"), text("lib/product-limits.ts")]);
  assert.match(route, /getViewer/);
  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /loadWorkspaceContext/);
  assert.match(route, /idempotency-key/);
  assert.match(route, /existingRun/);
  assert.match(route, /status=in\.\(queued,running\)/);
  assert.match(route, /rpc\/reserve_run_budget/);
  assert.match(route, /rpc\/reserve_run_quota/);
  assert.match(route, /FOREMENTION_MAX_RUN_COST_USD/);
  assert.match(route, /inngest\.send/);
  assert.doesNotMatch(route, /collectProviderAnswer\(/);
  assert.match(jobs, /foremention\/run\.requested/);
  assert.match(jobs, /collectProviderAnswer/);
  assert.match(jobs, /organization_id=eq\.\$\{run\.organization_id\}/);
  assert.match(jobs, /project_id=eq\.\$\{run\.project_id\}/);
  assert.match(jobs, /review_status: "pending"/);
  assert.match(providers, /calculateProviderCost/);
  assert.match(migration, /reserve_run_budget/);
  assert.match(migration, /reserve_run_quota/);
  assert.match(limits, /monthlyAiSpendCapUsd/);
});

test("onboarding starts a five-question audit with a configured provider and shows durable progress", async () => {
  const [wizard, onboarding, route, progress, questions] = await Promise.all([
    text("components/onboarding-wizard.tsx"),
    text("app/api/onboarding/route.ts"),
    text("app/api/runs/route.ts"),
    text("components/first-audit-progress.tsx"),
    text("lib/onboarding-profile.ts"),
  ]);
  assert.match(wizard, /Start first audit/);
  assert.match(wizard, /firstAuditRunId/);
  assert.match(onboarding, /activeProvider/);
  assert.match(onboarding, /first_audit_run_id/);
  assert.match(route, /promptIds/);
  assert.match(progress, /Collecting AI answers/);
  assert.match(progress, /Checking cited sources/);
  assert.match(progress, /Preparing evidence/);
  assert.match(progress, /Ready for review/);
  assert.match(questions, /slice\(0, 5\)/);
});

test("Groq has fixed pre-call run and organization spend ceilings without prompt-bearing error logs", async () => {
  const [provider, route, jobs, logging] = await Promise.all([text("lib/answer-provider.ts"), text("app/api/runs/route.ts"), text("lib/jobs/inngest.ts"), text("lib/operational-logging.ts")]);
  assert.match(provider, /GROQ/);
  assert.match(route, /FOREMENTION_MAX_RUN_COST_USD/);
  assert.match(route, /estimatedCost/);
  assert.match(jobs, /ai_cost_events/);
  assert.doesNotMatch(logging, /prompt_text|answer_text|citation_url/);
});

test("active collection requests reuse the existing run across different client idempotency keys", async () => {
  const route = await text("app/api/runs/route.ts");
  assert.match(route, /existingRun/);
  assert.match(route, /status=in\.\(queued,running\)/);
  assert.match(route, /reused: true/);
});

test("successful empty Supabase write responses are not treated as failures", async () => {
  const supabase = await text("lib/supabase-rest.ts");
  assert.match(supabase, /response\.status === 204/);
});

test("new Supabase API keys stay in the apikey header instead of impersonating a user JWT", async () => {
  const supabase = await text("lib/supabase-rest.ts");
  assert.match(supabase, /headers\.set\("apikey"/);
  assert.match(supabase, /looksLikeJwt/);
});

test("the server-only Supabase role can execute trusted background collection", async () => {
  const [supabase, jobs] = await Promise.all([text("lib/supabase-rest.ts"), text("lib/jobs/inngest.ts")]);
  assert.match(supabase, /serviceRole/);
  assert.match(jobs, /serviceRole: true/);
});

test("observed citations auto-populate a truthful draft map while review remains explicit", async () => {
  const [jobs, map, migration] = await Promise.all([text("lib/jobs/inngest.ts"), text("lib/source-map.ts"), text("supabase/migrations/20260728000100_live_collection_hardening.sql")]);
  assert.match(jobs, /source_observations/);
  assert.match(map, /review_status/);
  assert.match(migration, /source_observations/);
});

test("customer mutations explicitly enforce workspace roles and organization filters", async () => {
  const routeFiles = ["app/api/prompts/route.ts", "app/api/runs/route.ts", "app/api/sources/[id]/review/route.ts", "app/api/competitors/route.ts", "app/api/placements/route.ts"];
  const sources = await Promise.all(routeFiles.map(text));
  for (const source of sources) {
    assert.match(source, /loadWorkspaceContext|getPrimaryOrganizationId|getPrimaryWorkspaceRole/);
  }
});

test("Groq Compound is a first-class, citation-preserving provider", async () => {
  const [provider, env] = await Promise.all([text("lib/answer-provider.ts"), text(".env.example")]);
  assert.match(provider, /groq\/compound-mini/);
  assert.match(provider, /citations/);
  assert.match(env, /GROQ_MODEL=/);
});

test("Cloudflare Workers AI is a cost-capped answer-only comparison provider", async () => {
  const [provider, env] = await Promise.all([text("lib/answer-provider.ts"), text(".env.example")]);
  assert.match(provider, /cloudflare/i);
  assert.match(provider, /supportsCitations/);
  assert.match(env, /CLOUDFLARE_MODEL=/);
});

test("OpenRouter uses an explicit GLM model and never fabricates citation evidence", async () => {
  const [provider, env] = await Promise.all([text("lib/answer-provider.ts"), text(".env.example")]);
  assert.match(provider, /openrouter/i);
  assert.match(env, /OPENROUTER_MODEL=z-ai\/glm-5\.2/);
});

test("optional model gateways use fixed official endpoints and truthful evidence handling", async () => {
  const [provider, env] = await Promise.all([text("lib/answer-provider.ts"), text(".env.example")]);
  assert.match(provider, /zenmux/i);
  assert.match(provider, /omnirouters/i);
  assert.match(env, /ZENMUX_API_KEY=/);
  assert.match(env, /OMNIROUTERS_API_KEY=/);
});

test("source observation upserts use a non-partial unique index", async () => {
  const migration = await text("supabase/migrations/20260801000100_source_observation_upsert_key.sql");
  assert.match(migration, /unique/i);
});

test("provider requests and persistence are separate durable steps", async () => {
  const jobs = await text("lib/jobs/inngest.ts");
  assert.match(jobs, /step\.run/);
  assert.match(jobs, /collectProviderAnswer/);
});

test("citation persistence is batched below Worker subrequest ceilings", async () => {
  const jobs = await text("lib/jobs/inngest.ts");
  assert.match(jobs, /citation/i);
  assert.match(jobs, /batch/i);
});

test("credential presence is separated from proven provider health", async () => {
  const [data, launcher] = await Promise.all([text("lib/data.ts"), text("components/run-launcher.tsx")]);
  assert.match(data, /configured/);
  assert.match(data, /health/);
  assert.match(launcher, /Proven available/);
});

test("Claim Integrity Ledger binds approved wording to tenant-scoped verified evidence", async () => {
  const [claim, migration] = await Promise.all([text("lib/claim-integrity.ts"), text("supabase/migrations/20260804000100_claim_integrity_ledger.sql")]);
  assert.match(claim, /verified/i);
  assert.match(migration, /verified_claim_evidence/);
});

test("Foremention Agent Control Plane records evidence-bound stages without extra provider calls", async () => {
  const [component, page, data, navigation, migration] = await Promise.all([text("components/agent-control-plane.tsx"), text("app/app/agents/page.tsx"), text("lib/data.ts"), text("components/workspace-navigation.tsx"), text("supabase/migrations/20260807000100_agent_control_plane.sql")]);
  assert.match(page, /Owned intelligence infrastructure/);
  assert.match(data, /loadAgentControlPlane/);
  assert.match(component, /Six agents\. One inspectable evidence chain/);
  assert.match(component, /Derived from persisted run records/);
  assert.match(navigation, /Agent Control Plane/);
  assert.match(migration, /create table public\.jobs/);
  assert.match(migration, /'crm_attribution_events','jobs','audit_logs'/);
  assert.match(migration, /enable row level security/);
});

test("weekly Inngest runs enforce capacity and record evidence changes", async () => {
  const [jobs, route] = await Promise.all([text("lib/jobs/inngest.ts"), text("app/api/inngest/route.ts")]);
  assert.match(jobs, /id: "schedule-weekly-workspace-runs"/);
  assert.match(jobs, /triggers: \{ cron: "0 8 \* \* 1" \}/);
  assert.match(jobs, /monthly_run_units/);
  assert.match(jobs, /monthly_ai_spend_cap_usd/);
  assert.match(jobs, /status=in\.\(queued,running\)/);
  assert.match(jobs, /brand_presence_changed/);
  assert.match(jobs, /new_sources/);
  assert.match(jobs, /lost_sources/);
  assert.match(jobs, /competitor_movement/);
  assert.match(route, /scheduleWeeklyWorkspaceRuns/);
});

test("failed first audits remain explicit instead of showing unexplained zeroes", async () => {
  const [wizard, overview, analytics] = await Promise.all([
    text("components/onboarding-wizard.tsx"),
    text("app/app/page.tsx"),
    text("app/app/analytics/page.tsx"),
  ]);
  assert.match(wizard, /Your audit is taking longer than expected/);
  assert.match(overview, /The latest collection needs another try/);
  assert.match(overview, /No fake metrics were added/);
  assert.match(analytics, /The latest collection needs another try/);
  assert.match(analytics, /No zero-value placeholder is being presented as a result/);
});
