import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Analytics attaches Product Truth provenance to all four primary metrics", async () => {
  const page = await text("app/app/analytics/page.tsx");
  assert.match(page, /ProductTruthPanel/);
  for (const id of [
    "analytics-brand-presence",
    "analytics-first-mention",
    "analytics-citation-observations",
    "analytics-human-reviewed-sources",
  ]) assert.match(page, new RegExp(id));
  assert.match(page, /Why you can trust these Analytics metrics/);
  assert.match(page, /exact persisted buyer-question text, provider, exact model, and methodology/);
  assert.match(page, /Provider-returned citations/);
});

test("Analytics does not mislabel a crawler check as human source review", async () => {
  const page = await text("app/app/analytics/page.tsx");
  assert.match(page, /pageCheckedCount = sources\.filter\(\(source\) => source\.crawlerAccess !== "unknown"\)\.length/);
  assert.match(page, /humanReviewedSourceCount = sources\.filter\(\(source\) => Boolean\(source\.reviewedAt\)\)\.length/);
  assert.match(page, /A page check alone is not counted as human review/);
  assert.match(page, /Human-reviewed sources/);
  assert.doesNotMatch(page, /const reviewedSourceCount = sources\.filter\(\(source\) => source\.crawlerAccess !== "unknown"\)/);
});

test("Analytics denominator and verification copy keep AI review, source review, and page inspection separate", async () => {
  const page = await text("app/app/analytics/page.tsx");
  assert.match(page, /Only verified answer rows from a finalized reviewed collection enter this baseline/);
  assert.match(page, /unknown positions are not invented/);
  assert.match(page, /Only returned citation evidence is counted; absent citations are not inferred/);
  assert.match(page, /Source review is separate from AI-answer verification and separate from Source Change Graph fingerprint observations/);
});
