import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("public and workspace mobile layouts stay bounded and preserve dense data scrolling", async () => {
  const css = await text("app/globals.css");
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /html, body \{ max-width: 100%; overflow-x: clip; \}/);
  assert.match(css, /\.public-header \.mobile-nav \{ display: block/);
  assert.match(css, /\.app-topbar \{ min-height: 68px; display: grid/);
  assert.match(css, /\.notification-bell__panel \{ position: fixed/);
  assert.match(css, /\.data-table, \.run-table,[\s\S]*overflow-x: auto/);
  assert.match(css, /-webkit-overflow-scrolling: touch/);
  assert.match(css, /min-height: 44px/);
});
