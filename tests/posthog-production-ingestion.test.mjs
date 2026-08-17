import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production PostHog config cannot silently depend on missing NEXT_PUBLIC build variables", async () => {
  const analytics = await text("lib/product-analytics.ts");

  assert.match(analytics, /const PRODUCTION_POSTHOG_PROJECT_TOKEN = "phc_[A-Za-z0-9]+";/);
  assert.match(analytics, /const PRODUCTION_POSTHOG_HOST = "https:\/\/us\.i\.posthog\.com";/);
  assert.match(analytics, /process\.env\.NODE_ENV === "production"/);
  assert.match(analytics, /projectToken: PRODUCTION_POSTHOG_PROJECT_TOKEN/);
  assert.match(analytics, /apiHost: PRODUCTION_POSTHOG_HOST/);
});

test("PostHog environment template points Foremention at the connected US Cloud ingestion region", async () => {
  const envExample = await text(".env.example");
  assert.match(envExample, /^NEXT_PUBLIC_POSTHOG_HOST=https:\/\/us\.i\.posthog\.com$/m);
});

test("PostHog transport identity survives final-send minimization without weakening application property filtering", async () => {
  const analytics = await text("lib/product-analytics.ts");

  assert.match(analytics, /blockedPropertyPattern[\s\S]*token/);
  assert.match(analytics, /postHogTransportPropertyKeys\s*=\s*new Set\(\["token", "distinct_id"\]\)/);
  assert.match(analytics, /function sanitizePostHogEventProperties/);
  assert.match(analytics, /postHogTransportPropertyKeys\.has\(key\) \|\| !blockedPropertyPattern\.test\(key\)/);
  assert.match(analytics, /properties: sanitizePostHogEventProperties\(event\.properties as Record<string, unknown>\)/);
  assert.match(analytics, /posthog\.capture\(name, sanitizeProperties\(properties\)\)/);
});
