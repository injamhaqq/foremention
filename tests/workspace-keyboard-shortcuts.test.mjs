import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activateShortcutTarget } from "../lib/workspace-shortcut-activation.ts";

test("workspace shortcuts are global, safe while typing, and expose J K R A E", async () => {
  const source = await readFile(new URL("../components/workspace-keyboard-shortcuts.tsx", import.meta.url), "utf8");
  for (const key of ["j", "k", "r", "a", "e"]) assert.match(source, new RegExp(`key === "${key}"`));
  assert.match(source, /isTypingTarget\(event\.target\)/);
  assert.match(source, /data-workspace-item/);
  assert.match(source, /data-workspace-review/);
  assert.match(source, /data-workspace-action/);
  assert.match(source, /data-workspace-export/);
});

test("source map exposes keyboard navigation, review, and export targets", async () => {
  const table = await readFile(new URL("../components/source-map-table.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/app/source-map/page.tsx", import.meta.url), "utf8");
  assert.match(table, /data-workspace-item/);
  assert.match(table, /data-workspace-review/);
  assert.match(page, /data-workspace-export/);
});

test("shortcuts report activation only when the target is actionable", () => {
  let clicks = 0;
  function target(attrs = {}) {
    return {
      hasAttribute: (key) => key in attrs,
      getAttribute: (key) => attrs[key] ?? null,
      click: () => { clicks += 1; },
    };
  }
  assert.equal(activateShortcutTarget(null), false);
  assert.equal(activateShortcutTarget(target({ disabled: "" })), false);
  assert.equal(activateShortcutTarget(target({ inert: "" })), false);
  assert.equal(activateShortcutTarget(target({ "aria-disabled": "true" })), false);
  assert.equal(clicks, 0, "Unavailable controls must not be clicked");
  assert.equal(activateShortcutTarget(target({ "aria-disabled": "false" })), true);
  assert.equal(clicks, 1, "One enabled control should receive one click");
});

test("shortcut announcements cannot claim an unavailable review or export succeeded", async () => {
  const source = await readFile(new URL("../components/workspace-keyboard-shortcuts.tsx", import.meta.url), "utf8");
  assert.match(source, /if \\(activate\\("\\[data-workspace-review\\]"\\)\\) \\{/);
  assert.match(source, /if \\(activate\\("\\[data-workspace-export\\]"\\)\\) \\{/);
  assert.match(source, /document\\.querySelector\\('\\[aria-modal="true"\\], dialog\\[open\\]'\\)/);
  assert.doesNotMatch(source, /Started the available export\\.|Opened the review action\\./);
});
