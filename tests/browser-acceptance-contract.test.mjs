import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [workflow, runner, lighthouse] = await Promise.all([
  text(".github/workflows/browser-acceptance.yml"),
  text("scripts/browser-acceptance.mjs"),
  text("lighthouserc.cjs"),
]);

test("browser acceptance is permanent on pull requests and exact main releases", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /production-auth-smoke\.mjs/);
  assert.match(workflow, /FOREMENTION_EXPECTED_BUILD_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /wrangler dev --local --config dist\/server\/wrangler\.json --ip 127\.0\.0\.1 --port 4173/);
  assert.match(workflow, /FOREMENTION_BROWSER_BASE_URL=http:\/\/127\.0\.0\.1:4173/);
  assert.match(workflow, /Waiting for local Worker \(\$\{attempt\}\/60\)/);
});

test("browser tooling is pinned and production secrets are confined to trusted acceptance", () => {
  assert.match(workflow, /"playwright": "1\.60\.0"/);
  assert.match(workflow, /"@axe-core\/playwright": "4\.12\.1"/);
  assert.match(workflow, /"@lhci\/cli": "0\.15\.1"/);
  const prStep = workflow.match(/- name: Run public browser and accessibility acceptance[\s\S]*?run: node scripts\/browser-acceptance\.mjs/)?.[0] || "";
  const trustedStep = workflow.match(/- name: Run trusted production browser and accessibility acceptance[\s\S]*?run: node scripts\/browser-acceptance\.mjs/)?.[0] || "";
  assert.doesNotMatch(prStep, /secrets\./);
  assert.match(trustedStep, /if: github\.event_name != 'pull_request'/);
  assert.match(trustedStep, /FOREMENTION_ACCEPTANCE_EMAIL: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_EMAIL \}\}/);
  assert.match(trustedStep, /FOREMENTION_ACCEPTANCE_PASSWORD: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_PASSWORD \}\}/);
});

test("public acceptance covers the core conversion surfaces and product regressions", () => {
  for (const path of ["/", "/product", "/pricing", "/score", "/prompt-check", "/login", "/signup"]) {
    assert.match(runner, new RegExp(`"${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(runner, /\.analytics-consent/);
  assert.match(runner, /Help improve Foremention/);
  assert.match(runner, /#source-xray/);
  assert.match(runner, /#source-xray-stage/);
  assert.match(runner, /ArrowRight/);
  assert.match(runner, /keyboard reveal did not respond to Enter/);
  assert.match(runner, /Horizontal viewport overflow detected/);
  assert.match(runner, /Uncaught browser page error detected/);
  assert.match(runner, /Browser console error detected/);
});

test("accessibility is blocking for serious regressions while Lighthouse starts audit-first", () => {
  assert.match(runner, /wcag2a/);
  assert.match(runner, /wcag2aa/);
  assert.match(runner, /violation\.impact === "serious" \|\| violation\.impact === "critical"/);
  assert.match(lighthouse, /"categories:performance": \["warn", \{ minScore: 0\.75 \}\]/);
  assert.match(lighthouse, /"categories:accessibility": \["warn", \{ minScore: 0\.95 \}\]/);
  assert.match(lighthouse, /"categories:best-practices": \["warn", \{ minScore: 0\.9 \}\]/);
});

test("authenticated browser acceptance is real but explicitly skippable without dedicated credentials", () => {
  for (const path of ["/app", "/app/prompts", "/app/runs", "/app/source-map", "/app/settings"]) {
    assert.match(runner, new RegExp(`"${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(runner, /FOREMENTION_ACCEPTANCE_EMAIL/);
  assert.match(runner, /FOREMENTION_ACCEPTANCE_PASSWORD/);
  assert.match(runner, /Authenticated routes SKIPPED/);
  assert.match(runner, /Authenticated critical path did not render/);
});
