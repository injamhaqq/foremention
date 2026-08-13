import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const form = new URL("../components/source-review-form.tsx", import.meta.url);

test("source review exposes the Resolution Center handoff only when the persisted gap is ready", async () => {
  const source = await readFile(form, "utf8");

  assert.match(source, /result\.opportunity\?\.action === "created"/);
  assert.match(source, /result\.opportunity\?\.action === "refreshed"/);
  assert.match(source, /ready in Resolution Center/);
  assert.match(source, /href="\/app\/resolutions"/);
  assert.match(source, /Complete both influence and feasibility review/);
  assert.match(source, /prior gap was archived/);
});
