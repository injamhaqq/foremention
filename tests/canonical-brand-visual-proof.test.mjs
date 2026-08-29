import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = async (path) => {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
};

const approvedAssetPaths = [
  "public/brand/foremention-logo-white.svg",
  "public/brand/foremention-mark-white.svg",
];

const retiredAssetPaths = [
  "public/brand/foremention-logo.svg",
  "public/brand/foremention-mark.svg",
  "public/foremention-wordmark.png",
  "public/source-eclipse.svg",
  "app/icon.svg",
  "app/icon.png",
  "app/favicon.ico",
  "public/og.png",
  "public/og-platform.png",
];

test("approved canonical Foremention identity assets stay present while legacy identity stays absent", async () => {
  for (const path of approvedAssetPaths) {
    assert.equal(await exists(path), true, `${path} must remain present`);
  }
  for (const path of retiredAssetPaths) {
    assert.equal(await exists(path), false, `${path} must remain retired`);
  }
});

test("rendered brand surfaces use the approved image-backed canonical identity", async () => {
  const [brand, publicShell, workspaceNav] = await Promise.all([
    text("components/brand.tsx"),
    text("components/public-shell.tsx"),
    text("components/workspace-navigation.tsx"),
  ]);

  assert.match(brand, /wordmark__art/);
  assert.match(brand, /foremention-logo-white\.svg/);
  assert.match(brand, /foremention-mark-white\.svg/);
  assert.match(brand, /<img/);
  assert.match(brand, /ForementionMark/);
  assert.doesNotMatch(brand, /wordmark--text-only|wordmark__text/);
  assert.match(publicShell, /Wordmark/);
  assert.match(workspaceNav, /Wordmark|ForementionMark/);
});

test("canonical identity visual proof covers app shell, accessibility, mobile widths, approved assets, and legacy absence", async () => {
  const [runner, workflow] = await Promise.all([
    text("scripts/canonical-brand-visual-proof.mjs"),
    text(".github/workflows/browser-acceptance.yml"),
  ]);

  for (const width of [1440, 1024, 768, 375, 320]) {
    assert.match(runner, new RegExp(`width: ${width}`));
  }

  assert.match(runner, /approvedIdentityPaths/);
  assert.match(runner, /retiredIdentityPaths/);
  assert.match(runner, /verifyApprovedIdentity/);
  assert.match(runner, /Approved Foremention logo artwork is not visibly rendered/);
  assert.match(runner, /Text-only Foremention fallback is still rendered instead of the approved logo/);
  assert.match(runner, /wordmark__art/);
  assert.match(runner, /foremention-logo-white\.svg/);
  assert.match(runner, /foremention-mark-white\.svg/);
  assert.match(runner, /Explore the fictional workspace/);
  assert.match(runner, /page\.waitForURL\(\(url\) => url\.pathname === "\/app"/);
  assert.match(runner, /horizontal overflow/);
  assert.match(runner, /AxeBuilder/);
  assert.match(runner, /serious or critical accessibility violations/);
  assert.match(runner, /fullPage: true/);
  assert.match(runner, /Approved Foremention identity asset is not publicly available as SVG/);
  assert.match(runner, /A non-approved legacy identity asset is still publicly available/);

  const invocations = workflow.match(/node scripts\/canonical-brand-visual-proof\.mjs/g) || [];
  assert.ok(invocations.length >= 2, "canonical identity visual proof must run for PR candidates and trusted production acceptance");
});
