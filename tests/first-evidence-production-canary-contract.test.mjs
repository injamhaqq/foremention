import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [workflow, canary] = await Promise.all([
  text(".github/workflows/first-evidence-canary.yml"),
  text("scripts/first-evidence-production-canary.mjs"),
]);

test("the production canary is trusted-main only and exact releases require explicit enablement plus spend approval", () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_CANARY_ENABLED/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED/);
  assert.match(canary, /FOREMENTION_ACCEPTANCE_CANARY_REQUIRED/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_CANARY_REQUIRED: 'true'/);
  assert.match(canary, /skipped-canary-not-enabled/);
  assert.match(canary, /skipped-provider-spend-not-approved/);
  assert.match(canary, /Exact-release authenticated first-evidence canary is required but is not explicitly enabled/);
  assert.match(canary, /Exact-release authenticated first-evidence canary requires explicit provider-spend approval/);
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
  assert.match(canary, /locator\('input\[name="password"\]'\)/);
  assert.doesNotMatch(canary, /getByLabel\("Password", \{ exact: true \}\)/);
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

test("the canary derives a privacy-safe exact fixture fingerprint and fails closed until it is pinned", () => {
  assert.match(canary, /import \{ createHash \} from "node:crypto"/);
  assert.match(canary, /acceptanceFixtureFingerprint: null/);
  assert.match(canary, /const expectedAcceptanceFixtureFingerprint = ""/);
  assert.match(canary, /sameOriginFetch\(page, "\/api\/onboarding", \{\s*method: "POST"/s);
  assert.match(canary, /existing !== true/);
  assert.match(canary, /organizationId/);
  assert.match(canary, /const canarySlot = approved\[0\]/);
  assert.match(canary, /createHash\("sha256"\)/);
  assert.match(canary, /\.update\(`\$\{organizationId\}:\$\{canarySlot\.id\}`\)/);
  assert.match(canary, /acceptance-fixture-fingerprint-observed/);
  assert.match(canary, /Acceptance fixture fingerprint is not pinned; refusing to mutate or spend/);
  assert.doesNotMatch(canary, /stableSyntheticQuestions/);
  assert.doesNotMatch(canary, /sidebar-company strong/);
  const fingerprintGate = canary.indexOf("Acceptance fixture fingerprint is not pinned; refusing to mutate or spend");
  const patchMutation = canary.indexOf('sameOriginFetch(page, "/api/prompts", {');
  assert.ok(fingerprintGate >= 0 && patchMutation > fingerprintGate, "fingerprint pin gate must precede prompt mutation");
});

test("the dedicated synthetic canary maintains a freshness-dependent web-evidence question through the ordinary prompt API", () => {
  assert.match(canary, /const freshWebEvidenceQuestion =/);
  assert.match(canary, /most recently published post on openai\.com\/news/);
  assert.match(canary, /Cite the exact openai\.com source URL/);
  assert.match(canary, /If you cannot verify it with current web evidence, say so rather than answering from memory/);
  assert.match(canary, /sameOriginFetch\(page, "\/api\/prompts", \{\s*method: "PATCH"/s);
  assert.match(canary, /fresh-web-evidence-question-updated/);
  assert.match(canary, /fresh-web-evidence-question-verified/);
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
  assert.doesNotMatch(canary, /\/api\/opportunities\/.*method:\s*"PATCH"/s);
});

test("the canary proves ordinary sign-out clears the acceptance session and re-protects the workspace", () => {
  assert.match(canary, /getByRole\("button", \{ name: "Sign out", exact: true \}\)/);
  assert.match(canary, /authenticated-session-cleared-after-sign-out/);
  assert.match(canary, /post-logout-workspace-boundary-verified/);
  assert.match(canary, /searchParams\.get\("next"\) !== "\/app"/);
});
