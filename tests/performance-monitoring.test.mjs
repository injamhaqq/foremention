import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("performance events report only bucketed latency for first-party API requests", () => {
  const source = readFileSync("components/posthog-analytics.tsx", "utf8");
  assert.match(source, /performance_observed/);
  assert.match(source, /latencyBucket/);
  assert.match(source, /httpStatusClass/);
  assert.match(source, /function isFirstPartyApiRequest/);
  assert.match(source, /parsed\.origin === window\.location\.origin/);
  assert.match(source, /parsed\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(source, /page_load_performance|api_performance/);
  assert.doesNotMatch(source, /p50_ms|p95_ms|p99_ms|duration_ms|safeApiRoute/);
  assert.doesNotMatch(source, /route:\s*parsed\.pathname/);
});

test("PostHog pageviews expose only stable product surfaces", () => {
  const source = readFileSync("components/posthog-analytics.tsx", "utf8");
  assert.match(source, /function productSurface\(pathname: string\)/);
  assert.match(source, /captureProductEvent\("\$pageview", \{ surface: productSurface\(pathname\) \}\)/);
  assert.doesNotMatch(source, /posthog\.capture\("\$pageview"/);
  assert.doesNotMatch(source, /\$current_url\s*:/);
  assert.doesNotMatch(source, /route:\s*pathname/);
  for (const surface of ["home", "score", "signup", "overview", "onboarding", "questions", "ai_results", "sources", "competitors", "opportunities", "actions", "analytics", "settings", "workspace_other", "public_other"]) {
    assert.match(source, new RegExp(`"${surface}"`), `missing stable product surface ${surface}`);
  }
});

test("PostHog rebuilds final-send properties from the strict allowlist contract", () => {
  const analytics = readFileSync("lib/product-analytics.ts", "utf8");
  const contract = readFileSync("lib/product-analytics-contract.ts", "utf8");
  assert.match(analytics, /before_send: \(event\) => sanitizePostHogPayload\(event\)/);
  assert.match(analytics, /sanitizeProductAnalyticsEvent\(event\.event, rawProperties\)/);
  assert.match(analytics, /\.\.\.transport/);
  assert.match(analytics, /\.\.\.sanitized\.properties/);
  assert.match(contract, /if \(!EVENT_NAMES\.has\(normalized\.event\)\) return null/);
  assert.doesNotMatch(analytics, /sanitizePostHogEventProperties|blockedPropertyPattern/);
  assert.match(analytics, /capture_pageview: false/);
  assert.match(analytics, /autocapture: false/);
  assert.match(analytics, /capture_exceptions: false/);
  assert.match(analytics, /disable_session_recording: true/);
});
