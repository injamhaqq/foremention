import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const polish = await text("app/product-polish.css");

test("retired advanced sidebar presentation is removed from active polish CSS", () => {
  assert.doesNotMatch(polish, /sidebar-advanced/);
  assert.doesNotMatch(polish, /#3f3b36|#cfc8be|#928b82/i);
});

test("workspace search uses canonical dark tokens at the source", () => {
  const rule = polish.match(/\.workspace-search-page input\s*\{[\s\S]*?\}/)?.[0] || "";
  assert.match(rule, /border:\s*1px solid var\(--fm-border-strong\)/);
  assert.match(rule, /background:\s*var\(--fm-bg\)/);
  assert.match(rule, /color:\s*var\(--fm-clean\)/);
  assert.doesNotMatch(rule, /var\(--white\)|white|#fff/i);
});

test("product-polish no longer defines sub-12px control text", () => {
  assert.doesNotMatch(polish, /font-size:\s*(?:8|9|10|11)px/);
});
