import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("canonical brand visual proof covers the app shell, social image, favicon, and all approved widths", async () => {
  const [runner, workflow] = await Promise.all([
    text("scripts/canonical-brand-visual-proof.mjs"),
    text(".github/workflows/browser-acceptance.yml"),
  ]);

  for (const width of [1440, 1024, 768, 375, 320]) {
    assert.match(runner, new RegExp(`width: ${width}`));
  }

  assert.match(runner, /new URL\("\/login", baseUrl\)/);
  assert.match(runner, /Explore the fictional workspace/);
  assert.match(runner, /page\.waitForURL\(\(url\) => url\.pathname === "\/app"/);
  assert.match(runner, /final\.pathname !== "\/app"/);
  assert.match(runner, /verifyCanonicalBrandArtwork/);
  assert.match(runner, /Visible legacy Foremention identity substitute detected/);
  assert.match(runner, /fullPage: true/);

  assert.match(runner, /new URL\("\/og\.png", baseUrl\)/);
  assert.match(runner, /readUInt32BE\(16\)/);
  assert.match(runner, /readUInt32BE\(20\)/);
  assert.match(runner, /dimensions\.width !== 1200 \|\| dimensions\.height !== 630/);
  assert.match(runner, /social-og\.png/);

  assert.match(runner, /new URL\("\/favicon\.ico", baseUrl\)/);
  assert.match(runner, /favicon\.ico/);

  const invocations = workflow.match(/node scripts\/canonical-brand-visual-proof\.mjs/g) || [];
  assert.ok(invocations.length >= 2, "brand visual proof must run for PR candidates and trusted production acceptance");
});
