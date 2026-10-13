import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activateFirstAvailableShortcutTarget, activateShortcutTarget } from "../lib/workspace-shortcut-activation.ts";

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
  assert.ok(source.includes('if (activate("[data-workspace-review]")) {'));
  assert.ok(source.includes('if (activate("[data-workspace-export]")) {'));
  assert.ok(source.includes('document.querySelector(\'[aria-modal="true"], dialog[open]\')'));
  assert.ok(!source.includes("Started the available export."));
  assert.ok(!source.includes("Opened the review action."));
});

test("review shortcut skips disabled and invisible bulk actions for the next available source link", () => {
  const clicked = [];
  const target = (name, attributes = {}, visible = true) => ({
    hasAttribute: (key) => Object.hasOwn(attributes, key),
    getAttribute: (key) => attributes[key] ?? null,
    getClientRects: () => visible ? [{}] : [],
    click: () => clicked.push(name),
  });
  assert.equal(activateFirstAvailableShortcutTarget([
    target("disabled bulk review", { disabled: "" }),
    target("hidden bulk review", {}, false),
    target("enabled per-source review"),
    target("later row review"),
  ]), true);
  assert.deepEqual(clicked, ["enabled per-source review"], "Only the first usable review target can be activated");
  assert.equal(activateFirstAvailableShortcutTarget([target("disabled", { disabled: "" })]), false);
  assert.equal(activateFirstAvailableShortcutTarget([]), false);
  assert.equal(activateShortcutTarget(target("aria-hidden", { "aria-hidden": "true" })), false);
  assert.equal(activateShortcutTarget(target("hidden", { hidden: "" })), false);
});
test("source map keyboard lookup scans usable links after a disabled bulk action", async () => {
  const source = await readFile(new URL("../components/workspace-keyboard-shortcuts.tsx", import.meta.url), "utf8");
  assert.match(source, /Array\.from\(activeItem\.querySelectorAll/);
  assert.match(source, /\.\.\.document\.querySelectorAll/);
  assert.match(source, /activateFirstAvailableShortcutTarget\(candidates\)/);
});
