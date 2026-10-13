import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const rootRequire = createRequire(import.meta.url);
const bracesRoot = path.join(process.cwd(), "vendor", "braces");
const micromatchRoot = path.join(process.cwd(), "vendor", "micromatch");

function nestedAst(depth) {
  let node = { type: "text", value: "a" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "brace", nodes: [node], ranges: 0, commas: 0, invalid: false };
  }
  return { type: "root", nodes: [node] };
}

test("downstream fork preserves provenance and removes the vulnerable package identity", () => {
  const bracesPkg = JSON.parse(fs.readFileSync(path.join(bracesRoot, "package.json"), "utf8"));
  const micromatchPkg = JSON.parse(fs.readFileSync(path.join(micromatchRoot, "package.json"), "utf8"));
  const lock = fs.readFileSync(path.join(process.cwd(), "pnpm-lock.yaml"), "utf8");

  assert.equal(bracesPkg.name, "@foremention/braces");
  assert.equal(bracesPkg.version, "3.0.3-foremention.1");
  assert.equal(bracesPkg.license, "MIT");
  assert.equal(bracesPkg.forementionProvenance.upstreamSecurityCommit, "d0d575e55e74a4e0218e5248fafb79efc3e54ebb");

  assert.equal(micromatchPkg.name, "@foremention/micromatch");
  assert.equal(micromatchPkg.version, "4.0.8-foremention.1");
  assert.equal(micromatchPkg.license, "MIT");
  assert.equal(micromatchPkg.dependencies["@foremention/braces"], "file:../braces");

  assert.ok(lock.includes("micromatch: file:vendor/micromatch"));
  assert.ok(lock.includes("@foremention/braces"));
  assert.ok(!lock.includes("braces@3.0.3"));
  assert.ok(!/^  braces@/m.test(lock), "unscoped braces package identity must be absent");
  assert.ok(!/^[ \t]+braces:/m.test(lock), "unscoped braces dependency identity must be absent");
});

test("forked braces preserves representative normal behavior", () => {
  const braces = rootRequire("@foremention/braces");
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
  assert.deepEqual(braces.expand("a/{b,c}/d"), ["a/b/d", "a/c/d"]);
  assert.equal(braces.stringify(braces.parse("{{a}}"), { escapeInvalid: true }), "{{a}}");
});

test("forked micromatch consumes @foremention/braces and preserves brace matching", () => {
  const micromatch = rootRequire("@foremention/micromatch");
  assert.deepEqual(micromatch(["a.js","b.ts","c.md"], "*.{js,ts}"), ["a.js","b.ts"]);
  assert.deepEqual(micromatch.braceExpand("src/{a,b}.js"), ["src/a.js","src/b.js"]);
});

test("forked braces accepts the 100-level boundary and rejects level 101", () => {
  const braces = rootRequire("@foremention/braces");
  const atLimit = "{".repeat(100) + "a,b" + "}".repeat(100);
  const overLimit = "{".repeat(101) + "a,b" + "}".repeat(101);
  assert.doesNotThrow(() => braces.parse(atLimit));
  assert.throws(() => braces.parse(overLimit), /exceeds max depth/);
});

test("forked braces guards caller-supplied deep ASTs", () => {
  const braces = rootRequire("@foremention/braces");
  assert.throws(() => braces.compile(nestedAst(101)), /exceeds max depth/);
  assert.throws(() => braces.stringify(nestedAst(101)), /exceeds max depth/);
  assert.throws(() => braces.expand(nestedAst(101)), /exceeds max depth/);
});
