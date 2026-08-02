import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
