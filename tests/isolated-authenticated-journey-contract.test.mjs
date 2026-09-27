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
  assert.match(journey,/three-ephemeral-local-auth-users-created/);
  assert.match(journey,/ordinary-run-review-published-one-citation-four-zero-citation-questions/);
  assert.match(journey,/real-change-spec-review-role-gates-and-manager-approval/);
  assert.match(journey,/evidence-linked-resolution-and-company-controlled-execution/);
  assert.match(journey,/ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result/);
  assert.match(journey,/real-authenticated-browser-rendered-isolated-audited-journey/);
  assert.match(workflow,/supabase start/);
  assert.match(workflow,/supabase db reset/);
  assert.match(workflow,/pnpm exec wrangler dev --local/);
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
