import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Source Map supports required filters and deterministic sorting", async () => {
  const table = await readFile(new URL("../components/source-map-table.tsx", import.meta.url), "utf8");
  assert.match(table, /Source type/);
  assert.match(table, /Brand present/);
  assert.match(table, /Competitor present/);
  assert.match(table, /Reachability/);
  assert.match(table, /Citation observations/);
  assert.match(table, /Review status/);
  assert.match(table, /entry\.type === sourceType/);
  assert.match(table, /entry\.crawlerAccess === reachability/);
  assert.match(table, /entry\.competitors\.length > 0/);
});
