import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("source map publication lifecycle is separate from evidence review state", async () => {
  const [migration, generator] = await Promise.all([
    text("supabase/migrations/20260915000100_source_map_review_state.sql"),
    text("lib/source-map-generation.ts"),
  ]);
  assert.match(migration, /add column if not exists review_state text not null default 'observed'/i);
  assert.match(migration, /check \(review_state in \('observed','reviewed'\)\)/i);
  assert.match(migration, /name like 'Reviewed collection %'[\s\S]*review_state = 'reviewed'/i);
  assert.match(generator, /review_state:\s*reviewStatus === "verified" \? "reviewed" : "observed"/);
});

test("customer decision loaders require reviewed source maps rather than merely published maps", async () => {
  const [data, evidence, intelligence, change] = await Promise.all([
    text("lib/data.ts"),
    text("lib/evidence-integrity-data.ts"),
    text("lib/intelligence-loop.ts"),
    text("lib/ai-observation-change.ts"),
  ]);
  for (const source of [data, evidence, intelligence, change]) {
    assert.match(source, /review_state=eq\.reviewed/);
  }
  assert.doesNotMatch(change, /name\.startsWith\("Reviewed collection"\)/);
});

test("observed source maps remain explicitly available for inspection without becoming reviewed evidence", async () => {
  const generator = await text("lib/source-map-generation.ts");
  assert.match(generator, /generateObservedSourceMap/);
  assert.match(generator, /generateReviewedSourceMap/);
  assert.match(generator, /reviewStatus === "verified" \? "Reviewed" : "Observed"/);
});
