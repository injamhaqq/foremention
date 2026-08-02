import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Source Map clusters are deterministic and use recorded publisher signals", async () => {
  const clustering = await readFile(new URL("../lib/source-clustering.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/app/source-map/page.tsx", import.meta.url), "utf8");
  for (const label of ["Public institutions", "Research and editorial", "Reviews and comparisons", "Communities", "Vendor and product pages"]) assert.match(clustering, new RegExp(label));
  assert.match(clustering, /source\.type/);
  assert.match(clustering, /source\.domain/);
  assert.match(clustering, /entry\.evidenceCount/);
  assert.match(page, /clusterSources\(entries\)/);
  assert.match(page, /<SourceClusters clusters=\{clusters\}/);
});
