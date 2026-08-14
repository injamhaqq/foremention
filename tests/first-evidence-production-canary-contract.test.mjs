import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [workflow, canary] = await Promise.all([
  text(".github/workflows/first-evidence-canary.yml"),
  text("scripts/first-evidence-production-canary.mjs"),
]);

test("the production canary is trusted-main only and remains inert without explicit enablement plus spend approval", () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_CANARY_ENABLED/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED/);
  assert.match(canary, /skipped-canary-not-enabled/);
  assert.match(canary, /skipped-provider-spend-not-approved/);
  assert.match(canary, /restricted to https:\/\/foremention\.com/);
  assert.match(workflow, /Run authenticated first-evidence production canary/);
  assert.match(workflow, /production-auth-smoke\.mjs/);
  assert.match(workflow, /FOREMENTION_EXPECTED_BUILD_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_EMAIL: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_EMAIL \}\}/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_PASSWORD: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_PASSWORD \}\}/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_CANARY_ENABLED: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_CANARY_ENABLED \}\}/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED \}\}/);
});

test("the canary uses the real customer session and API path without an auth, RLS, provider, or publication bypass", () => {
  assert.match(canary, /getByRole\("button", \{ name: "Sign in", exact: true \}\)/);
  assert.match(canary, /credentials: "same-origin"/);
  assert.match(canary, /\/api\/onboarding/);
  assert.match(canary, /\/api\/prompts/);
  assert.match(canary, /\/api\/runs/);
  assert.match(canary, /\/api\/runs\/\$\{run\.id\}\/review/);
  assert.doesNotMatch(canary, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(canary, /service.?role/i);
  assert.doesNotMatch(canary, /auth.?bypass/i);
  assert.doesNotMatch(canary, /providers:\s*\["mock"\]/i);
});

test("the canary preserves the five-question baseline but spends on exactly one question and one provider", () => {
  assert.match(canary, /approved\.length !== 5/);
  assert.match(canary, /promptIds: \[promptId\]/);
  assert.match(canary, /providers: \[provider\]/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_MAX_COST_USD/);
  assert.match(canary, /maxCostUsd > 1/);
  assert.match(canary, /acceptance:\$\{expectedBuildCommit\}/);
  assert.match(canary, /duplicate\.body\?\.duplicate !== true/);
});

test("the release canary proves persisted answer, model, review publication and exact Source X-Ray navigation when citations exist", () => {
  assert.match(canary, /The real provider run persisted no answer observations/);
  assert.match(canary, /Recorded model/);
  assert.match(canary, /human-review-publication-gate-exercised/);
  assert.match(canary, /a\[href\^="\/app\/sources\/"\]/);
  assert.match(canary, /source-xray-opened-from-exact-run-citation/);
  assert.match(canary, /form\.source-review-form/);
});

test("the canary refuses to manufacture analyst source facts or opportunity evidence", () => {
  assert.match(canary, /opportunityMutationAttempted: false/);
  assert.match(canary, /opportunity-mutation-withheld-without-human-source-facts/);
  assert.doesNotMatch(canary, /api\/sources\/.*\/review/);
  assert.doesNotMatch(canary, /method:\s*"PATCH"/);
});
