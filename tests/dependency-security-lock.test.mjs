import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const advisories = ["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"];

test("patched image-size dependency is consistently locked and cannot regress silently", async () => {
  const [workspace, lock, config] = await Promise.all([
    read("pnpm-workspace.yaml"), read("pnpm-lock.yaml"), read("osv-scanner.toml"),
  ]);
  assert.match(workspace, /^  image-size: 2\\.0\\.4$/m);
  assert.match(lock, /^  image-size: 2\\.0\\.4$/m);
  assert.match(lock, /^  image-size@2\\.0\\.4:$/m);
  assert.match(lock, /^      image-size: 2\\.0\\.4$/m);
  assert.doesNotMatch(lock, /image-size(?:@|: )2\\.0\\.2/);
  for (const id of advisories) {
    assert.doesNotMatch(config, new RegExp(`id\\s*=\\s*"${id}"`), `cannot suppress ${id}`);
  }
});
