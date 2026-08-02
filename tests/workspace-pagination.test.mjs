import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("large workspace lists use bounded pages or incremental rendering", async () => {
  const runs = await readFile(new URL("../app/app/runs/page.tsx", import.meta.url), "utf8");
  const evidence = await readFile(new URL("../app/app/evidence/page.tsx", import.meta.url), "utf8");
  const sourceMap = await readFile(new URL("../components/source-map-table.tsx", import.meta.url), "utf8");
  const gaps = await readFile(new URL("../components/opportunity-list.tsx", import.meta.url), "utf8");
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  assert.match(runs, /pageSize = 20/);
  assert.match(runs, /offset: \(page - 1\) \* pageSize/);
  assert.match(evidence, /pageSize = 20/);
  assert.match(sourceMap, /visibleCount/);
  assert.match(sourceMap, /Load 25 more sources/);
  assert.match(gaps, /Load 10 more gaps/);
  assert.match(data, /&limit=\$\{limit\}&offset=\$\{offset\}/);
});
