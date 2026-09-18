import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/browser-acceptance-hardening.css", import.meta.url),
  "utf8",
);

test("authenticated partial evidence pills use the stable dark evidence token", () => {
  assert.match(css, /\.app-frame \.pill\.pill--partial[\s\S]*color:\s*var\(--re-ink\)/);
  assert.match(css, /\.app-frame \.feasibility\.feasibility--medium[\s\S]*color:\s*var\(--re-ink\)/);
  assert.doesNotMatch(css, /pill--partial[\s\S]*color:\s*var\(--ink\)/);
});
