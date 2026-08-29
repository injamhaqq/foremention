import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production canary verifies evidence inspection inside the Recommendation Record", async () => {
  const canary = await text("scripts/first-evidence-production-canary.mjs");

  assert.match(canary, /canonical-contained-evidence/);
  assert.match(canary, /Evidence inspection/);
  assert.match(canary, /sourceReviewFormVisible/);
  assert.doesNotMatch(canary, /Source X-Ray|sourceXrayOpened|source-xray-/i);
  assert.doesNotMatch(canary, /a\[href\^="\/app\/sources\/"\]/);
});

test("Foremention keeps the approved logo instead of a text-only compatibility fallback", async () => {
  const brand = await text("components/brand.tsx");

  assert.match(brand, /foremention-logo-white\.svg/);
  assert.match(brand, /foremention-logo-green\.svg/);
  assert.match(brand, /foremention-monogram\.svg/);
  assert.match(brand, /next\/image/);
  assert.doesNotMatch(brand, /export function ForementionMark\(\)\s*\{\s*return null;/);
  assert.doesNotMatch(brand, /wordmark--text-only/);
});

test("authenticated release hardening stays black and green without white inspection sheets", async () => {
  const css = await text("app/canonical-release-qa.css");

  assert.match(css, /\.app-frame \.weekly-loop-teaser/);
  assert.match(css, /background:\s*#(?:090b0a|0d0f0e|111412|151817)\s*!important/i);
  assert.match(css, /border-color:\s*#176347\s*!important/i);
  assert.doesNotMatch(css, /background:\s*#fffdf9\s*!important/i);
  assert.doesNotMatch(css, /warm inspection sheet/i);
});
