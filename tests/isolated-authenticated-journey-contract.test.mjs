import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("real authenticated customer acceptance must only run against local ephemeral accounts and provider-free records", async () => {
  const [journey,workflow,env] = await Promise.all([
    read("../scripts/isolated-authenticated-journey.mjs"),
    read("../.github/workflows/isolated-authenticated-journey.yml"),
    read("../scripts/prepare-isolated-local-env.mjs")
  ]);
  assert.match(journey,/Refusing any non-local authenticated acceptance target/);
  assert.match(journey,/awaitLocalPostgrestJwt\(sessionValue\)/);
  assert.match(journey,/response\.status!==401\|\|code!==\"PGRST303\"/);
  assert.match(journey,/attempt<12/);
  assert.match(journey,/if\(\+\+successes>=2\)return/);
  assert.match(journey,/throw Error\(\"Isolated local PostgREST JWT preflight rejected/);
  assert.match(journey,/three-ephemeral-local-auth-users-created/);
  assert.match(journey,/post-review-local-postgrest-status-/);
  assert.match(journey,/x-foremention-isolated-final-read/);
  assert.match(journey,/x-foremention-isolated-post-review-read/);
  assert.match(journey,/final-local-postgrest-status-/);
  assert.match(journey,/const state=must\(finalRead,200,"final audited resolution read"\)/);
  assert.match(journey,/probeCode=candidate==="PGRST303"\?"PGRST303":"other"/);
  assert.match(journey,/ordinary-run-review-published-one-citation-four-zero-citation-questions/);
  assert.match(journey,/real-change-spec-review-role-gates-and-manager-approval/);
  assert.match(journey,/evidence-linked-resolution-and-company-controlled-execution/);
  assert.match(journey,/ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result/);
  assert.match(journey,/real-authenticated-browser-rendered-isolated-audited-journey/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.ok(workflow.includes("pnpm build"),"must compile production Vinext/Worker artifact");
  assert.ok(workflow.includes("pnpm run start -- --host 127.0.0.1 --port 4174"),
    "isolated real routes must run against the compiled Vinext application");
  assert.ok(workflow.includes("CI and Browser Acceptance independently verify"),
    "independent production Worker verification remains explicit");
  assert.match(workflow,/node scripts\/isolated-authenticated-journey\.mjs/);
  assert.match(workflow,/rm -f \.isolated-local-env \.dev.vars/);
  assert.doesNotMatch(workflow,/secrets\.|foremention\.com|FOREMENTION_ACCEPTANCE_EMAIL|FOREMENTION_ACCEPTANCE_PASSWORD/);
  assert.match(env,/NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(env,/127\.0\.0\.1/);
  assert.doesNotMatch(journey,/https?:\/\/(?:api\.openai\.com|www\.bing\.com|foremention\.com|supabase\.com)/);
});

test("test-only provider seeding cannot be represented as real provider measurements", async () => {
  const text=await read("../scripts/isolated-authenticated-journey.mjs");
  assert.match(text,/provider:"fixture-mock"/);
  assert.match(text,/no-cost-model-v1/);
  assert.match(text,/fixture\.invalid/);
  assert.match(text,/No real external publication/);
  assert.match(text,/no providers, no production, no customer-value claim/);
  assert.doesNotMatch(text, /POST.*\/api\/runs(?:\x60|["'])/i);
});

test("analyst-scoped source and change writes preserve admin-write-only audit receipts", async () => {
  const [sourceReview,changes,resolutions] = await Promise.all([
    read("../app/api/sources/[id]/review/route.ts"),
    read("../app/api/change-specifications/route.ts"),
    read("../app/api/resolutions/route.ts"),
  ]);
  for (const code of [sourceReview,changes,resolutions]) {
    assert.match(code, /supabaseRest\("audit_logs",\s*\{[\s\S]*?serviceRole: true/);
    assert.match(code, /actor_id: viewer\.id/);
  }
  assert.match(sourceReview, /source_map_entries\?id=eq\.\$\{entry\.id\}[\s\S]*?method: "PATCH",[\s\S]*?token: accessToken/);
  assert.match(sourceReview, /if \(!role \|\| role === "viewer"\)/);
  assert.match(changes, /if \(!writable\(role\)\)/);
  assert.match(resolutions, /if \(!writable\(role\)\)/);
});

test("isolated authenticated acceptance exercises positive and drifted nine-field outcome reports without secrets", async () => {
  const journey=await read("../scripts/isolated-authenticated-journey.mjs");
  for(const route of ["/app/outcomes","/app/outcomes/print"]){
    assert.ok(journey.includes(route),route+" must be read via the actual browser");
  }
  assert.match(journey,/authenticated-outcome-ledger-and-board-exact-context-chain-owner-only/);
  assert.match(journey,/real-authenticated-protocol-drift-fail-closed-in-page-and-board-export/);
  assert.match(journey,/contextOverride:\{evaluationVersion:"fixture-different-evaluation-v2"\}/);
  assert.match(journey,/assert\.equal\(persistedDrift\[0\]\.status,"complete"/);
  assert.match(journey,/new URL\(anonymousPage\.url\(\)\)\.pathname/);
  assert.match(journey,/getByText\(record\.title,\{exact:true\}\)\.count\(\)/);
  assert.doesNotMatch(journey,/foremention\.com|FOREMENTION_ACCEPTANCE_PASSWORD|www\.bing\.com/);
});
