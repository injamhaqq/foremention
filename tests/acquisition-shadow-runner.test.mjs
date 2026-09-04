import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("shadow workflow is repo-authorized, OIDC-enabled, and explicitly confirmed", async () => {
  const workflow = await text(".github/workflows/acquisition-shadow-run.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /inputs:\s*\n\s+confirm:/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /inputs\.confirm == 'RUN'/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /pull-requests:\s*write/);
  assert.doesNotMatch(workflow, /secrets\.INNGEST/);
});

test("shadow runner waits for exact production and uses short-lived GitHub OIDC", async () => {
  const source = await text("scripts/invoke-acquisition-shadow.mjs");
  assert.match(source, /HEALTH_ENDPOINT = `\$\{BASE_URL\}\/api\/health`/);
  assert.match(source, /SHADOW_ENDPOINT = `\$\{BASE_URL\}\/api\/ops\/acquisition-shadow`/);
  assert.match(source, /OIDC_AUDIENCE = "foremention-acquisition-shadow"/);
  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(source, /ACQUISITION_SHADOW_CONFIRM_REQUIRED/);
  assert.match(source, /MAX_WAIT_MS = 300_000/);
  assert.match(source, /lastBuild === expectedBuild/);
  assert.match(source, /shadow\.status !== "shadow_drafted"/);
  assert.doesNotMatch(source, /INNGEST_AUTH_TOKEN/);
  assert.doesNotMatch(source, /api\.inngest\.com/);
});

test("shadow runner never prints or serializes GitHub OIDC credentials", async () => {
  const source = await text("scripts/invoke-acquisition-shadow.mjs");
  assert.doesNotMatch(source, /console\.log\([^\n]*requestToken/);
  assert.doesNotMatch(source, /JSON\.stringify\([^\n]*requestToken/);
  assert.doesNotMatch(source, /console\.log\([^\n]*oidc\.token/);
  assert.doesNotMatch(source, /JSON\.stringify\([^\n]*oidc\.token/);
});

test("production operator route requires repo-bound OIDC and exact deployed SHA", async () => {
  const route = await text("app/api/ops/acquisition-shadow/route.ts");
  assert.match(route, /verifyGitHubActionsOidcToken/);
  assert.match(route, /FOREMENTION_BUILD_COMMIT/);
  assert.match(route, /identity\.releaseSha !== buildCommit/);
  assert.match(route, /createOrLoadAcquisitionShadowRequest/);
  assert.match(route, /name: "foremention\/acquisition\.shadow\.requested"/);
  assert.match(route, /id: `acquisition-shadow-\$\{requestKey\}`/);
  assert.match(route, /runtimeBindings\(\)\.INNGEST_EVENT_KEY/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.doesNotMatch(route, /process\.env/);
});

test("OIDC verifier pins repository, main ref, workflow, runner, audience, and signature", async () => {
  const verifier = await text("lib/acquisition-github-oidc.ts");
  assert.match(verifier, /EXPECTED_REPOSITORY = "injamhaqq\/foremention"/);
  assert.match(verifier, /EXPECTED_REPOSITORY_ID = "1310253121"/);
  assert.match(verifier, /EXPECTED_REF = "refs\/heads\/main"/);
  assert.match(verifier, /EXPECTED_WORKFLOW = "Acquisition Shadow Run"/);
  assert.match(verifier, /ACQUISITION_SHADOW_OIDC_AUDIENCE = "foremention-acquisition-shadow"/);
  assert.match(verifier, /runner_environment !== "github-hosted"/);
  assert.match(verifier, /crypto\.subtle\.verify/);
  assert.match(verifier, /header\.alg !== "RS256"/);
});

test("requested acquisition function persists terminal truth and is registered", async () => {
  const job = await text("lib/jobs/acquisition-discovery.ts");
  const route = await text("app/api/inngest/route.ts");
  assert.match(job, /id: "discover-acquisition-targets-shadow-requested"/);
  assert.match(job, /triggers: \{ event: "foremention\/acquisition\.shadow\.requested" \}/);
  assert.match(job, /onFailure: async/);
  assert.match(job, /finishAcquisitionShadowRequest/);
  assert.match(job, /markAcquisitionShadowRunning/);
  assert.match(route, /runRequestedAcquisitionShadow/);
});

test("shadow request ledger is service-only and aggregate", async () => {
  const migration = await text("supabase/migrations/20260904000300_acquisition_shadow_requests.sql");
  assert.match(migration, /alter table public\.acquisition_shadow_requests enable row level security/);
  assert.match(migration, /revoke all on table public\.acquisition_shadow_requests from anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.acquisition_shadow_requests to service_role/);
  assert.match(migration, /candidate_count integer/);
  assert.match(migration, /draft_created_count integer/);
  assert.doesNotMatch(migration, /email\s+text/i);
  assert.doesNotMatch(migration, /contact_name/i);
});
