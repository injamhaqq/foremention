// Guards for docs/repository-register/register-2026-10.csv.
// REJECT rows must not become dependencies; UNRESOLVED rows have no licence,
// so nothing from them may be vendored or copied. KEEP rows that are enforced
// by CI keep their concrete hooks (pinned Wrangler + dry runs, gitleaks
// synthetic fixture, cross-engine Playwright, privacy-minimised PostHog).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(join(root, path), "utf8");

async function workflowSources() {
  const dir = join(root, ".github/workflows");
  const names = (await readdir(dir)).filter((name) => /\.ya?ml$/.test(name));
  return Promise.all(names.map(async (name) => ({ name, text: await readFile(join(dir, name), "utf8") })));
}

// Identifiers only; the register CSV itself lives under docs/ and is not scanned here.
const rejected = [
  { repo: "tashfeenahmed/freellmapi", pattern: /freellmapi/i },
  { repo: "vitest-dev/vitest", pattern: /(^|[^a-z])vitest([^a-z]|$)/i },
  { repo: "EpicGames/raddebugger", pattern: /raddebugger|raddbg/i },
];
const unresolved = [
  { repo: "Bristotle/ai-visibility-tracker", pattern: /ai-visibility-tracker|visibility_tracker|Bristotle/i },
  { repo: "alvinunreal/freesubstats.com", pattern: /freesubstats/i },
];

test("REJECT and UNRESOLVED register rows are not dependencies, lockfile entries, or workflow steps", async () => {
  const manifest = await read("package.json");
  const lockfile = await read("pnpm-lock.yaml");
  const workflows = await workflowSources();
  for (const { repo, pattern } of [...rejected, ...unresolved]) {
    assert.doesNotMatch(manifest, pattern, `${repo} must not appear in package.json`);
    assert.doesNotMatch(lockfile, pattern, `${repo} must not appear in pnpm-lock.yaml`);
    for (const { name, text } of workflows) {
      assert.doesNotMatch(text, pattern, `${repo} must not appear in .github/workflows/${name}`);
    }
  }
});

test("unlicensed UNRESOLVED repositories are not vendored", async () => {
  const vendored = await readdir(join(root, "vendor"));
  for (const entry of vendored) {
    for (const { repo, pattern } of unresolved) {
      assert.doesNotMatch(entry, pattern, `${repo} must not be vendored (no licence)`);
    }
  }
});

test("workers-sdk: Wrangler is pinned exactly and CI dry-runs both Worker configs", async () => {
  const manifest = JSON.parse(await read("package.json"));
  assert.match(manifest.devDependencies.wrangler, /^\d+\.\d+\.\d+$/, "wrangler must be an exact pin");
  assert.match(manifest.devDependencies.vinext, /^\d+\.\d+\.\d+$/, "vinext must be an exact pin");
  const ci = await read(".github/workflows/ci.yml");
  assert.match(ci, /wrangler deploy --dry-run --config dist\/server\/wrangler\.json/);
  assert.match(ci, /wrangler deploy --dry-run --config wrangler\.jsonc/);
  assert.match(ci, /actions\/attest@/);
});

test("gitleaks: security workflow proves a synthetic secret is detected with redacted output", async () => {
  const security = await read(".github/workflows/security.yml");
  assert.match(security, /gitleaks\/gitleaks-action@[0-9a-f]{40}/);
  assert.match(security, /Prove gitleaks detects a synthetic secret without logging it/);
  assert.match(security, /sha256sum --check --strict/);
  assert.match(security, /--redact/);
  assert.match(security, /grep -qF "\$synthetic"/);
});

test("posthog: autocapture, session recording and page-leave capture stay off and payloads are sanitised", async () => {
  const analytics = await read("lib/product-analytics.ts");
  assert.match(analytics, /autocapture: false/);
  assert.match(analytics, /disable_session_recording: true/);
  assert.match(analytics, /capture_pageleave: false/);
  assert.match(analytics, /before_send: \(event\) => sanitizePostHogPayload\(event\)/);
});
