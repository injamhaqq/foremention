import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("performance events report only aggregate timing and sanitized API routes", () => {
  const source = readFileSync("components/posthog-analytics.tsx", "utf8");
  assert.match(source, /page_load_performance/);
  assert.match(source, /api_performance/);
  assert.match(source, /p50_ms/);
  assert.match(source, /p95_ms/);
  assert.match(source, /p99_ms/);
  assert.match(source, /safeApiRoute/);
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

test("PostHog strips URL, path and referrer context at the final send boundary", () => {
  const source = readFileSync("lib/product-analytics.ts", "utf8");
  assert.match(source, /before_send:/);
  assert.match(source, /sanitizeAnalyticsProperties\(event\.properties\)/);
  assert.match(source, /url\|pathname\|referrer\|referring_domain/);
  assert.match(source, /capture_pageview: false/);
  assert.match(source, /autocapture: false/);
  assert.match(source, /disable_session_recording: true/);
});
