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

const retiredAssetPaths = [
  "public/brand/foremention-logo.svg",
  "public/brand/foremention-logo-white.svg",
  "public/brand/foremention-mark.svg",
  "public/brand/foremention-mark-white.svg",
  "public/foremention-wordmark.png",
  "public/source-eclipse.svg",
  "app/icon.svg",
  "app/icon.png",
  "app/favicon.ico",
  "public/og.png",
  "public/og-platform.png",
];

test("retired Foremention identity assets stay absent", async () => {
  for (const path of retiredAssetPaths) {
    assert.equal(await exists(path), false, `${path} must remain retired`);
  }
});

test("rendered brand surfaces stay neutral text-only", async () => {
  const [brand, publicShell, workspaceNav] = await Promise.all([
    text("components/brand.tsx"),
    text("components/public-shell.tsx"),
    text("components/workspace-navigation.tsx"),
  ]);

  assert.match(brand, /wordmark--text-only/);
  assert.match(brand, /wordmark__text">Foremention/);
  assert.doesNotMatch(brand, /foremention-logo|foremention-mark|wordmark__art|<img/);
  assert.doesNotMatch(publicShell, /Wordmark inverse|ForementionMark/);
  assert.doesNotMatch(workspaceNav, /Wordmark inverse|ForementionMark/);
});

test("identity-retirement visual proof covers app shell, accessibility, mobile widths, and public asset absence", async () => {
  const [runner, workflow] = await Promise.all([
    text("scripts/canonical-brand-visual-proof.mjs"),
    text(".github/workflows/browser-acceptance.yml"),
  ]);

  for (const width of [1440, 1024, 768, 375, 320]) {
    assert.match(runner, new RegExp(`width: ${width}`));
  }

  assert.match(runner, /retiredIdentityPaths/);
  assert.match(runner, /verifyRetiredIdentityIsAbsent/);
  assert.match(runner, /Retired Foremention visual identity artwork is visibly rendered/);
  assert.match(runner, /Retired inverse\/white identity treatment is still present/);
  assert.match(runner, /wordmark--text-only/);
  assert.match(runner, /wordmark__text/);
  assert.match(runner, /Explore the fictional workspace/);
  assert.match(runner, /page\.waitForURL\(\(url\) => url\.pathname === "\/app"/);
  assert.match(runner, /horizontal overflow/);
  assert.match(runner, /AxeBuilder/);
  assert.match(runner, /serious or critical accessibility violations/);
  assert.match(runner, /fullPage: true/);
  assert.match(runner, /Retired Foremention identity asset is still publicly available/);

  const invocations = workflow.match(/node scripts\/canonical-brand-visual-proof\.mjs/g) || [];
  assert.ok(invocations.length >= 2, "identity-retirement visual proof must run for PR candidates and trusted production acceptance");
});
