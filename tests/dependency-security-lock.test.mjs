import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const advisories = ["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"];

test("Next security release is frozen without suppressing the newly indexed advisories", async () => {
  const [pkg, lock, config] = await Promise.all([read("package.json"), read("pnpm-lock.yaml"), read("osv-scanner.toml")]);
  assert.equal(JSON.parse(pkg).dependencies.next, "16.3.8");
  assert.match(lock, /^  next@16\.3\.8:$/m);
  assert.doesNotMatch(lock, /next(?:@|: )16\.3\.6/);
  for (const id of ["GHSA-39w2-rjm5-chcv", "GHSA-3w37-wq28-93x7", "GHSA-4jqv-mc3x-m676", "GHSA-cjq9-62q9-8jv4", "GHSA-f87g-xv8r-7p7x", "GHSA-mcj8-r9mp-w47p"]) {
    assert.equal(config.includes(`id = "${id}"`), false);
  }
});

test("sharp librsvg patch is frozen without suppressing GHSA-wq5f-xc86-pv6w", async () => {
  const [workspace, lock, config] = await Promise.all([
    read("pnpm-workspace.yaml"), read("pnpm-lock.yaml"), read("osv-scanner.toml"),
  ]);
  assert.match(workspace, /^  sharp: 0\.35\.5$/m);
  assert.match(lock, /^  sharp: 0\.35\.5$/m);
  assert.match(lock, /^  sharp@0\.35\.5:$/m);
  assert.doesNotMatch(lock, /sharp[^\n]*(?:@|: )0\.35\.4/);
  assert.equal(config.includes('id = "GHSA-wq5f-xc86-pv6w"'), false);
});

test("indexed-source-map DoS patch stays locked without suppressing its advisory", async () => {
  const [workspace, lock, config] = await Promise.all([
    read("pnpm-workspace.yaml"), read("pnpm-lock.yaml"), read("osv-scanner.toml"),
  ]);
  assert.match(workspace, /^  source-map-js@<=1\.2\.1: 1\.2\.2$/m);
  assert.match(lock, /^  source-map-js@<=1\.2\.1: 1\.2\.2$/m);
  assert.match(lock, /^  source-map-js@1\.2\.2:$/m);
  assert.match(lock, /^      source-map-js: 1\.2\.2$/m);
  assert.doesNotMatch(lock, /source-map-js(?:@|: )1\.2\.1(?::|\n)/);
  assert.equal(config.includes('id = "GHSA-68fv-2mgg-jv7q"'), false);
});

test("patched image-size dependency is consistently locked and cannot regress silently", async () => {
  const [workspace, lock, config] = await Promise.all([
    read("pnpm-workspace.yaml"), read("pnpm-lock.yaml"), read("osv-scanner.toml"),
  ]);
  assert.match(workspace, /^  image-size: 2\.0\.4$/m);
  assert.match(lock, /^  image-size: 2\.0\.4$/m);
  assert.match(lock, /^  image-size@2\.0\.4:$/m);
  assert.match(lock, /^      image-size: 2\.0\.4$/m);
  assert.doesNotMatch(lock, /image-size(?:@|: )2\.0\.2/);
  for (const id of advisories) {
    assert.equal(config.includes(`id = "${id}"`), false, `cannot suppress ${id}`);
  }
});
