import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [workflow, runner, hardening, lighthouse] = await Promise.all([
  text(".github/workflows/browser-acceptance.yml"),
  text("scripts/browser-acceptance.mjs"),
  text("scripts/browser-zoom-reflow.mjs"),
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

test("pull request Lighthouse audits isolate every route behind a fresh local Worker", () => {
  const prStep = workflow.match(/- name: Run pull request browser, accessibility and performance acceptance[\s\S]*?\.ci-tools\/node_modules\/\.bin\/lhci assert/)?.[0] || "";
  assert.match(prStep, /start_worker\(\)/);
  assert.match(prStep, /stop_worker\(\)/);
  assert.match(prStep, /for lighthouse_path in "\/" "\/product" "\/pricing" "\/score"/);
  assert.match(prStep, /start_worker[\s\S]*lhci collect[\s\S]*stop_worker/);
  assert.match(prStep, /lhci collect --config=\.\/lighthouserc\.cjs --additive --url "\$\{FOREMENTION_BROWSER_BASE_URL\}\$\{lighthouse_path\}"/);
  assert.match(prStep, /rm -rf \.lighthouseci/);
});

test("browser tooling is pinned and production secrets are confined to trusted acceptance", () => {
  assert.match(workflow, /"playwright": "1\.60\.0"/);
  assert.match(workflow, /"@axe-core\/playwright": "4\.12\.1"/);
  assert.match(workflow, /"@lhci\/cli": "0\.15\.1"/);
  const prStep = workflow.match(/- name: Run pull request browser, accessibility and performance acceptance[\s\S]*?\.ci-tools\/node_modules\/\.bin\/lhci assert/)?.[0] || "";
  const trustedStep = workflow.match(/- name: Run trusted production browser and accessibility acceptance[\s\S]*?node scripts\/canonical-brand-visual-proof\.mjs/)?.[0] || "";
  assert.doesNotMatch(prStep, /secrets\./);
  assert.match(trustedStep, /if: github\.event_name != 'pull_request'/);
  assert.match(trustedStep, /FOREMENTION_ACCEPTANCE_EMAIL: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_EMAIL \}\}/);
  assert.match(trustedStep, /FOREMENTION_ACCEPTANCE_PASSWORD: \$\{\{ secrets\.FOREMENTION_ACCEPTANCE_PASSWORD \}\}/);
});

test("public acceptance covers the core conversion surfaces and product regressions", () => {
  for (const path of ["/", "/product", "/pricing", "/score", "/prompt-check", "/login", "/signup"]) {
    assert.ok(runner.includes('"' + path + '"'));
  }
  assert.match(runner, /\.analytics-consent/);
  assert.match(runner, /Help improve Foremention/);
  assert.match(runner, /verifyRecommendationRecordEvidence/);
  assert.match(runner, /#recommendation-record/);
  assert.match(runner, /Recommendation Record keyboard anchor did not navigate to the record/);
  assert.doesNotMatch(runner, /#source-xray|#source-xray-stage|verifySourceXRay/);
  assert.match(runner, /Horizontal viewport overflow detected/);
  assert.match(runner, /Uncaught browser page error detected/);
  assert.match(runner, /Browser console error detected/);
});

test("browser acceptance captures every approved Foremention QA width", () => {
  assert.match(runner, /name: "chromium-desktop"[\s\S]{0,120}width: 1440/);
  assert.match(runner, /name: "chromium-laptop"[\s\S]{0,120}width: 1024/);
  assert.match(runner, /name: "chromium-tablet"[\s\S]{0,120}width: 768[\s\S]{0,80}height: 1024/);
  assert.match(runner, /name: "chromium-mobile"[\s\S]{0,120}width: 375/);
  assert.match(runner, /name: "chromium-narrow"[\s\S]{0,120}width: 320/);
});

test("browser acceptance requires the approved reverse identity and rejects white/warm surfaces", () => {
  assert.match(runner, /verifyCanonicalBrandArtwork/);
  assert.match(runner, /Approved Foremention identity artwork is not visibly rendered/);
  assert.match(runner, /Text-only Foremention fallback is still rendered/);
  assert.match(runner, /foremention-logo-white\.svg/);
  assert.match(runner, /foremention-mark-white\.svg/);
  assert.match(runner, /forbiddenLightBackgrounds/);
  assert.match(runner, /Visible website surface still uses a white\/warm-light background/);
  assert.match(runner, /\/foremention-wordmark\.png/);
  assert.match(runner, /\/source-eclipse\.svg/);
  assert.match(runner, /\.source-eclipse/);
  assert.match(runner, /\.wordmark__name/);
  assert.doesNotMatch(runner, /Retired inverse\/white identity treatment is still present/);
  assert.doesNotMatch(runner, /Neutral text-only Foremention product label is not visibly rendered/);
});

test("accessibility is blocking for serious regressions while Lighthouse starts audit-first", () => {
  assert.match(runner, /wcag2a/);
  assert.match(runner, /wcag2aa/);
  assert.match(runner, /violation\.impact === "serious" \|\| violation\.impact === "critical"/);
  assert.match(lighthouse, /"categories:performance": \["warn", \{ minScore: 0\.75 \}\]/);
  assert.match(lighthouse, /"categories:accessibility": \["warn", \{ minScore: 0\.95 \}\]/);
  assert.match(lighthouse, /"categories:best-practices": \["warn", \{ minScore: 0\.9 \}\]/);
});

test("trusted production authenticated browser acceptance fails closed while pull requests remain secret-free", () => {
  for (const path of ["/app", "/app/prompts", "/app/runs", "/app/source-map", "/app/settings"]) {
    assert.match(runner, new RegExp(`"${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(runner, /FOREMENTION_ACCEPTANCE_EMAIL/);
  assert.match(runner, /FOREMENTION_ACCEPTANCE_PASSWORD/);
  assert.match(runner, /locator\('input\[name="password"\]'\)/);
  assert.doesNotMatch(runner, /getByLabel\("Password", \{ exact: true \}\)/);
  assert.match(runner, /FOREMENTION_REQUIRE_AUTHENTICATED_ACCEPTANCE/);
  assert.match(workflow, /FOREMENTION_REQUIRE_AUTHENTICATED_ACCEPTANCE: 'true'/);
  assert.match(runner, /Trusted production authenticated browser acceptance is required but dedicated credentials are not configured/);
  assert.match(runner, /Authenticated routes SKIPPED/);
  assert.match(runner, /Authenticated critical path did not render/);
});

test("authenticated axe failures persist privacy-minimized actionable diagnostics", () => {
  assert.match(runner, /authenticated-axe/);
  assert.match(runner, /function sanitizeAxeViolation/);
  assert.match(runner, /target: node\.target/);
  assert.match(runner, /failureSummary: node\.failureSummary/);
  assert.match(runner, /data: check\.data/);
  assert.doesNotMatch(runner, /html:\s*node\.html/);
  assert.doesNotMatch(runner, /JSON\.stringify\(result, null, 2\)[\s\S]{0,180}authenticated-axe/);
});

test("failed browser responses persist privacy-safe status and pathname diagnostics", () => {
  assert.match(runner, /function sanitizeDiagnosticUrl/);
  assert.match(runner, /page\.on\("response"/);
  assert.match(runner, /response\.status\(\)/);
  assert.match(runner, /failedResponses/);
  assert.match(runner, /pathname: sanitizeDiagnosticUrl\(response\.url\(\)\)/);
  assert.match(runner, /new URL\(rawUrl, baseUrl\)/);
  assert.match(runner, /parsed\.origin !== baseOrigin/);
  assert.match(runner, /return parsed\.pathname/);
  assert.doesNotMatch(runner, /failedResponses[\s\S]{0,220}(search|searchParams|hash):/);
});

test("browser acceptance covers WebKit, low-height laptop, and mobile landscape", () => {
  assert.match(workflow, /playwright install --with-deps chromium firefox webkit/);
  assert.match(workflow, /node scripts\/browser-zoom-reflow\.mjs/);
  assert.match(hardening, /const \{ chromium, webkit \}/);
  assert.match(hardening, /name: "chromium-low-height"[\s\S]{0,140}width: 1366[\s\S]{0,80}height: 768/);
  assert.match(hardening, /name: "chromium-mobile-landscape"[\s\S]{0,160}width: 844[\s\S]{0,80}height: 390/);
  assert.match(hardening, /name: "webkit-mobile"[\s\S]{0,160}browserType: webkit[\s\S]{0,100}width: 390/);
});

test("browser acceptance models 200 and 400 percent zoom through the effective CSS viewport", () => {
  assert.match(hardening, /const zoomFactors = \[2, 4\]/);
  assert.match(hardening, /function effectiveViewport/);
  assert.match(hardening, /baseViewport\.width \/ zoomFactor/);
  assert.match(hardening, /page\.setViewportSize\(viewport\)/);
  assert.match(hardening, /page\.setViewportSize\(baseViewport\)/);
  assert.doesNotMatch(hardening, /document\.documentElement\.style\.zoom/);
  assert.match(hardening, /Zoom reflow overflow detected/);
  assert.match(hardening, /Nested content clipping detected/);
  assert.match(hardening, /chromium-authenticated-low-height/);
});

test("browser acceptance blocks 200 percent text-resize and forced-colors regressions", () => {
  assert.match(hardening, /verifyTextResize/);
  assert.match(hardening, /document\.documentElement\.style\.fontSize = "200%"/);
  assert.match(hardening, /200 percent text resize overflow detected/);
  assert.match(hardening, /verifyForcedColorsSmoke/);
  assert.match(hardening, /emulateMedia\(\{ forcedColors: "active" \}\)/);
  assert.match(hardening, /Forced-colors accessibility smoke did not expose a usable document/);
});