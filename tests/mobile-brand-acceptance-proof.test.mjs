import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const runner = await readFile(new URL("scripts/browser-acceptance.mjs", root), "utf8");

test("browser acceptance treats the approved responsive mark as canonical artwork", () => {
  assert.match(runner, /visibleApprovedMarks/);
  assert.match(runner, /img\.foremention-mark\[src=\\?"\/brand\/foremention-mark-white\.svg\\?"\]/);
  assert.match(runner, /visibleApprovedWordmarks\s*\+\s*visibleApprovedMarks/);
  assert.match(runner, /Approved Foremention (?:logo|identity) artwork is not visibly rendered/);
});

test("responsive brand proof still rejects text-only and legacy identity fallbacks", () => {
  assert.match(runner, /\.wordmark--text-only, \.wordmark__text/);
  assert.match(runner, /\/foremention-wordmark\.png/);
  assert.match(runner, /\/source-eclipse\.svg/);
  assert.match(runner, /img\[src=\\?"\/brand\/foremention-logo\.svg\\?"\]/);
  assert.match(runner, /img\[src=\\?"\/brand\/foremention-mark\.svg\\?"\]/);
});
