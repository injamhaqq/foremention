import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const rootRequire = createRequire(import.meta.url);
const vendorRoot = path.join(process.cwd(), "vendor", "braces");

function loadVendoredBraces() {
  return rootRequire(vendorRoot);
}

function nestedAst(depth) {
  let node = { type: "text", value: "a" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "brace", nodes: [node], ranges: 0, commas: 0, invalid: false };
  }
  return { type: "root", nodes: [node] };
}

test("vendored braces preserves reviewed provenance and removes the affected registry resolution", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(vendorRoot, "package.json"), "utf8"));
  const lock = fs.readFileSync(path.join(process.cwd(), "pnpm-lock.yaml"), "utf8");

  assert.equal(pkg.name, "braces");
  assert.equal(pkg.version, "3.0.4-foremention.1");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.forementionProvenance.baseVersion, "3.0.3");
  assert.equal(pkg.forementionProvenance.upstreamSecurityCommit, "d0d575e55e74a4e0218e5248fafb79efc3e54ebb");
  assert.equal(pkg.forementionProvenance.advisory, "GHSA-vfj7-8cjw-p6xm");
  assert.ok(lock.includes("file:vendor/braces"), "expected local braces override in lockfile");
  assert.ok(!lock.includes("braces@3.0.3"), "affected registry braces@3.0.3 must not remain in lockfile");
});

test("vendored braces preserves representative normal behavior", () => {
  const braces = loadVendoredBraces();
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
  assert.deepEqual(braces.expand("a/{b,c}/d"), ["a/b/d", "a/c/d"]);
  assert.equal(braces.stringify(braces.parse("{{a}}"), { escapeInvalid: true }), "{{a}}");
});

test("vendored braces accepts the 100-level boundary and rejects level 101", () => {
  const braces = loadVendoredBraces();
  const atLimit = "{".repeat(100) + "a,b" + "}".repeat(100);
  const overLimit = "{".repeat(101) + "a,b" + "}".repeat(101);
  assert.doesNotThrow(() => braces.parse(atLimit));
  assert.throws(() => braces.parse(overLimit), /exceeds max depth/);
});

test("vendored braces rejects hostile parser nesting early", () => {
  const braces = loadVendoredBraces();
  assert.doesNotThrow(() => braces.parse("{{a,b},c}", { maxDepth: 2 }));
  assert.throws(() => braces.parse("{{a,b},c}", { maxDepth: 1 }), /exceeds max depth/);
  const hostile = "{".repeat(1000) + "a,b" + "}".repeat(1000);
  assert.throws(() => braces.compile(hostile), /exceeds max depth/);
});

test("vendored braces guards caller-supplied deep ASTs", () => {
  const braces = loadVendoredBraces();
  assert.throws(() => braces.compile(nestedAst(101)), /exceeds max depth/);
  assert.throws(() => braces.stringify(nestedAst(101)), /exceeds max depth/);
  assert.throws(() => braces.expand(nestedAst(101)), /exceeds max depth/);
});
