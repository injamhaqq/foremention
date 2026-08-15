import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("pricing keeps stale competitor prices out while comparison evidence stays dated and first-party", async () => {
  const [pricing, compare, evidence] = await Promise.all([
    text("app/pricing/page.tsx"),
    text("app/compare/page.tsx"),
    text("lib/market-evidence-data.ts"),
  ]);

  assert.doesNotMatch(pricing, /Peec AI[\s\S]*\$95|Scrunch[\s\S]*\$250|Profound[\s\S]*\$399/);
  assert.doesNotMatch(pricing, /peec\.ai\/pricing|scrunch\.com\/pricing|tryprofound\.com\/pricing/);
  assert.match(compare, /marketEvidenceRecords/);
  assert.match(compare, /dated research set/i);
  assert.match(compare, /first-party vendor pages/i);
  assert.match(compare, /not that an AI engine cited the page/i);
  assert.match(compare, /not that a vendor claim is independently true/i);
  assert.match(evidence, /collectedAt:\s*"\d{4}-\d{2}-\d{2}"/);
  assert.match(evidence, /First-party product-page observations/);
});
