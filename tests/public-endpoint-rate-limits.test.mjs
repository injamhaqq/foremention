import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public tools have distinct endpoint limits and never log an IP address", () => {
  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /publicRateLimit\(request, env, "score", 3/);
  assert.match(worker, /publicRateLimit\(request, env, "prompt-check", 5/);
  assert.match(worker, /publicRateLimit\(request, env, "score-share", 30/);
  assert.ok(worker.includes('if (pathname.startsWith("/report/")) return { endpoint: "report", limit: 60'));
  assert.ok(worker.includes('if (pathname === "/grader" || pathname.startsWith("/grader/")) return { endpoint: "grader", limit: 20'));
  assert.ok(worker.includes('if (pathname.startsWith("/audit/")) return { endpoint: "audit", limit: 20'));
  assert.match(worker, /event: "public_rate_limit_hit", endpoint: rule\.endpoint/);
  assert.doesNotMatch(worker, /console\.warn\([^\n]*(address|fingerprint|cf-connecting-ip)/i);
});

test("public rate limit key falls back to a domain-separated derived key and fails closed", async () => {
  const { readFileSync } = await import("node:fs");
  const worker = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /async function publicRateLimitKey\(env: Env\)/);
  assert.match(worker, /foremention:public-rate-limit:v1:\$\{source\}/);
  assert.match(worker, /MIN_RATE_LIMIT_KEY_LENGTH = 32/);
  assert.match(worker, /if \(!env\.DB \|\| !rateLimitKey\) return \{ allowed: false, configured: false \}/);
});
