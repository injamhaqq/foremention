import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appShell = await readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");

test("authenticated workspace exposes a keyboard skip target", () => {
  assert.match(appShell, /href="#app-content"/);
  assert.match(appShell, /id="app-content"/);
  assert.match(appShell, /tabIndex=\{-1\}/);
});

test("public ROI scenario tool is discoverable in the sitemap", () => {
  assert.match(sitemap, /path: "\/roi"/);
  assert.match(sitemap, /2026-08-14T00:00:00Z/);
});
