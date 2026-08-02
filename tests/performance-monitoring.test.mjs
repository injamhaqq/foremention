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
