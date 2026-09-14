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

test("published maps are database-enforced reviewed evidence, never merely observed maps", async () => {
  const migration = await text("supabase/migrations/20260915000100_source_map_review_state.sql");
  assert.match(migration, /set status = 'draft'[\s\S]*review_state = 'observed'/i);
  assert.match(migration, /check \(status <> 'published' or review_state = 'reviewed'\)/i);
});

test("observed source maps remain inspectable without becoming published reviewed evidence", async () => {
  const generator = await text("lib/source-map-generation.ts");
  assert.match(generator, /generateObservedSourceMap/);
  assert.match(generator, /generateReviewedSourceMap/);
  assert.match(generator, /reviewStatus === "verified" \? "Reviewed" : "Observed"/);
  assert.match(generator, /status:\s*reviewStatus === "verified" \? "published" : "draft"/);
  assert.doesNotMatch(generator, /body:\s*\{ status: "published" \}/);
});
