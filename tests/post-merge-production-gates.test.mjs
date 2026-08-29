import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const gitBlobSha = (value) => createHash("sha1")
  .update(`blob ${Buffer.byteLength(value)}\0`)
  .update(value)
  .digest("hex");

test("production canary verifies evidence inspection inside the Recommendation Record", async () => {
  const canary = await text("scripts/first-evidence-production-canary.mjs");

  assert.match(canary, /canonical-contained-evidence/);
  assert.match(canary, /Evidence inspection/);
  assert.match(canary, /sourceReviewFormVisible/);
  assert.doesNotMatch(canary, /Source X-Ray|sourceXrayOpened|source-xray-/i);
  assert.doesNotMatch(canary, /a\[href\^="\/app\/sources\/"\]/);
});

test("Foremention renders the approved reverse logo instead of a text-only fallback", async () => {
  const [brand, identityCss] = await Promise.all([
    text("components/brand.tsx"),
    text("app/identity-retirement.css"),
  ]);

  assert.match(brand, /\/brand\/foremention-logo-white\.svg/);
  assert.match(brand, /\/brand\/foremention-mark-white\.svg/);
  assert.match(brand, /wordmark__art/);
  assert.match(brand, /foremention-mark/);
  assert.doesNotMatch(brand, /export function ForementionMark\([^)]*\)\s*\{\s*return null;/);
  assert.doesNotMatch(brand, /wordmark--text-only|wordmark__text/);
  assert.match(identityCss, /approved repository artwork/i);
  assert.doesNotMatch(identityCss, /neutral text-only|identity retirement guardrail/i);
});

test("approved reverse identity assets are restored byte-for-byte from the canonical repository history", async () => {
  const [logo, mark] = await Promise.all([
    text("public/brand/foremention-logo-white.svg"),
    text("public/brand/foremention-mark-white.svg"),
  ]);

  assert.equal(gitBlobSha(logo), "5254215bc32e391f3218576c0a1f3a14f0f19f8b");
  assert.equal(gitBlobSha(mark), "ac3bd7ad341bef4292227e3927b0d8d74d65600a");
});

test("authenticated and public release hardening stays black and green without white inspection sheets", async () => {
  const css = await text("app/canonical-release-qa.css");

  assert.match(css, /Foremention is a black \+ registered-green system/i);
  assert.match(css, /\.app-frame[\s\S]*background:\s*#0d0f0e\s*!important/i);
  assert.match(css, /\.weekly-loop-teaser[\s\S]*border-color:\s*#176347\s*!important/i);
  assert.match(css, /\.fm-public-shell[\s\S]*background:\s*#0d0f0e\s*!important/i);
  assert.doesNotMatch(css, /background:\s*#fffdf9\s*!important/i);
  assert.doesNotMatch(css, /background:\s*#f4f0e8\s*!important/i);
  assert.doesNotMatch(css, /warm inspection sheet|warm authenticated inspection/i);
});

test("brand visual proof requires approved artwork and rejects visible warm-light app surfaces", async () => {
  const proof = await text("scripts/canonical-brand-visual-proof.mjs");

  assert.match(proof, /approvedIdentityPaths/);
  assert.match(proof, /foremention-logo-white\.svg/);
  assert.match(proof, /foremention-mark-white\.svg/);
  assert.match(proof, /forbiddenLightBackgrounds/);
  assert.match(proof, /Approved Foremention logo artwork is not visibly rendered/);
  assert.doesNotMatch(proof, /Retired Foremention visual identity artwork is visibly rendered/);
});
