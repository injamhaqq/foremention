import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Groq web-search execution remains distinct from returned citations", async () => {
  const [adapter, data, page, canary] = await Promise.all([
    text("lib/providers/groq.ts"),
    text("lib/data.ts"),
    text("app/app/runs/[id]/page.tsx"),
    text("scripts/first-evidence-production-canary.mjs"),
  ]);

  assert.match(adapter, /tool\.type === "search"/);
  assert.match(adapter, /searchResultCount/);
  assert.match(adapter, /searchUsed/);
  assert.doesNotMatch(adapter, /searchUsed:\s*citations\.length\s*>\s*0/);

  assert.match(data, /raw_json/);
  assert.match(data, /providerDiagnostics/);
  assert.match(data, /searchResultCount/);
  assert.match(data, /searchUsed/);

  assert.match(page, /data-provider-search-used/);
  assert.match(page, /data-provider-search-result-count/);
  assert.doesNotMatch(page, /raw_json|raw_response/);

  assert.match(canary, /providerSearchUsed/);
  assert.match(canary, /providerSearchResultCount/);
  assert.match(canary, /data-provider-search-used/);
  assert.match(canary, /data-provider-search-result-count/);
});
