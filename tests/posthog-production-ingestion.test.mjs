import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production PostHog config is pinned and cannot be overridden by preview build variables", async () => {
  const analytics = await text("lib/product-analytics.ts");
  const contract = await text("lib/product-analytics-contract.ts");

  assert.match(analytics, /const PRODUCTION_POSTHOG_PROJECT_TOKEN = "phc_[A-Za-z0-9]+";/);
  assert.match(analytics, /const PRODUCTION_POSTHOG_HOST = "https:\/\/us\.i\.posthog\.com";/);
  assert.match(analytics, /shouldEnableProductAnalytics\(process\.env\.NODE_ENV, window\.location\.hostname\)/);
  assert.doesNotMatch(analytics, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN|NEXT_PUBLIC_POSTHOG_HOST/);
  assert.match(contract, /normalized === "foremention\.com" \|\| normalized === "www\.foremention\.com"/);
});

test("environment template cannot configure local, preview, test, or QA traffic into PostHog", async () => {
  const envExample = await text(".env.example");
  assert.doesNotMatch(envExample, /^NEXT_PUBLIC_POSTHOG_/m);
  assert.match(envExample, /product analytics is intentionally production-only/i);
});

test("PostHog final-send minimization rebuilds properties from the strict product contract", async () => {
  const analytics = await text("lib/product-analytics.ts");

  assert.match(analytics, /function sanitizePostHogPayload/);
  assert.match(analytics, /sanitizeProductAnalyticsEvent\(event\.event, rawProperties\)/);
  assert.match(analytics, /properties:\s*\{[\s\S]*\.\.\.transport,[\s\S]*\.\.\.sanitized\.properties/);
  assert.match(analytics, /\$groups: \{ organization: currentOrganizationId \}/);
  assert.match(analytics, /posthog\.capture\(sanitized\.event, sanitized\.properties\)/);
});

test("user identity is centralized and never attaches profile properties", async () => {
  const analytics = await text("lib/product-analytics.ts");
  const posthogComponent = await text("components/posthog-analytics.tsx");

  assert.match(analytics, /normalizeInternalAnalyticsId\(viewerId\)/);
  assert.match(analytics, /posthog\.identify\(normalizedViewerId\)/);
  assert.doesNotMatch(analytics, /posthog\.identify\([^\n]*email|posthog\.identify\([^\n]*name/i);
  assert.match(posthogComponent, /identifyProductAnalyticsUser\(viewerId, organizationId\)/);
  assert.doesNotMatch(posthogComponent, /import posthog from "posthog-js"/);
});
