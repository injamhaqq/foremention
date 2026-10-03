import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

function loadPatchedBraces() {
  const pnpmStore = path.join(process.cwd(), "node_modules", ".pnpm");
  const entry = fs.readdirSync(pnpmStore).find((name) => name.startsWith("braces@3.0.3"));
  assert.ok(entry, "expected braces@3.0.3 in pnpm virtual store");
  const packageRoot = path.join(pnpmStore, entry, "node_modules", "braces");
  return createRequire(import.meta.url)(packageRoot);
}

function nestedAst(depth) {
  let node = { type: "text", value: "a" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "brace", nodes: [node], ranges: 0, commas: 0, invalid: false };
  }
  return { type: "root", nodes: [node] };
}

test("patched braces preserves representative normal behavior", () => {
  const braces = loadPatchedBraces();
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
  assert.deepEqual(braces.expand("a/{b,c}/d"), ["a/b/d", "a/c/d"]);
  assert.equal(braces.stringify(braces.parse("{{a}}"), { escapeInvalid: true }), "{{a}}");
});

test("patched braces accepts the 100-level boundary and rejects level 101", () => {
  const braces = loadPatchedBraces();
  const atLimit = "{".repeat(100) + "a,b" + "}".repeat(100);
  const overLimit = "{".repeat(101) + "a,b" + "}".repeat(101);
  assert.doesNotThrow(() => braces.parse(atLimit));
  assert.throws(() => braces.parse(overLimit), /exceeds max depth/);
});

test("patched braces normalizes fractional configured depth and rejects hostile nesting early", () => {
  const braces = loadPatchedBraces();
  assert.throws(() => braces.parse("{{a,b},c}", { maxDepth: 1.5 }), /exceeds max depth/);
  assert.doesNotThrow(() => braces.parse("{{a,b},c}", { maxDepth: 2 }));
  const hostile = "{".repeat(1000) + "a,b" + "}".repeat(1000);
  assert.throws(() => braces.compile(hostile), /exceeds max depth/);
});

test("patched braces guards caller-supplied deep ASTs", () => {
  const braces = loadPatchedBraces();
  assert.throws(() => braces.compile(nestedAst(101)), /exceeds max depth/);
  assert.throws(() => braces.stringify(nestedAst(101)), /exceeds max depth/);
});
