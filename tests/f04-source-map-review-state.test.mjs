import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("source map publication lifecycle is separate from evidence review state", async () => {
  const migration = await text("supabase/migrations/20260915000100_source_map_review_state.sql");
  assert.match(migration, /add column if not exists review_state text not null default 'observed'/i);
  assert.match(migration, /check \(review_state in \('observed','reviewed'\)\)/i);
  assert.match(migration, /name like 'Reviewed collection %'[\s\S]*review_state = 'reviewed'/i);
});

test("published maps are database-enforced reviewed evidence, never merely observed maps", async () => {
  const migration = await text("supabase/migrations/20260915000100_source_map_review_state.sql");
  assert.match(migration, /set status = 'draft'[\s\S]*review_state = 'observed'/i);
  assert.match(migration, /check \(status <> 'published' or review_state = 'reviewed'\)/i);
  assert.match(migration, /create or replace function public\.normalize_source_map_review_state/);
  assert.match(migration, /new\.name like 'Reviewed collection %'[\s\S]*new\.review_state := 'reviewed'/i);
  assert.match(migration, /new\.name like 'Observed collection %'[\s\S]*new\.review_state := 'observed'/i);
  assert.match(migration, /new\.review_state = 'observed' and new\.status = 'published'[\s\S]*new\.status := 'draft'/i);
  assert.match(migration, /before insert or update of name, status, review_state on public\.source_maps/i);
});

test("observed and reviewed generators remain explicitly distinguishable", async () => {
  const generator = await text("lib/source-map-generation.ts");
  assert.match(generator, /generateObservedSourceMap/);
  assert.match(generator, /generateReviewedSourceMap/);
  assert.match(generator, /reviewStatus === "verified" \? "Reviewed" : "Observed"/);
});

test("reviewed source maps cannot regress when a slower observed rebuild finishes later", async () => {
  const migration = await text("supabase/migrations/20260920000100_source_map_review_monotonicity.sql");
  assert.match(migration, /old\.review_state = 'reviewed'/i);
  assert.match(migration, /new\.name like 'Observed collection %'/i);
  assert.match(migration, /new\.review_state := 'reviewed'/i);
  assert.match(migration, /new\.name := old\.name/i);
  assert.match(migration, /old\.status = 'published'[\s\S]*new\.status = 'draft'[\s\S]*new\.status := 'published'/i);
  assert.match(migration, /r\.status in \('complete', 'partial'\)/i);
  assert.match(migration, /ra\.review_status <> 'verified'/i);
  assert.match(migration, /so\.review_status <> 'verified'/i);
});

test("observed map generation stays draft while reviewed generation owns publication", async () => {
  const generator = await text("lib/source-map-generation.ts");
  assert.match(generator, /if \(reviewStatus === "verified"\)[\s\S]*body: \{ status: "published" \}/);
});
