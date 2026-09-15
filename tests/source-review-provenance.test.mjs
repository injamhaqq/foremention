import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("human source review never overwrites machine retrieval provenance", async () => {
  const [route, migration] = await Promise.all([
    text("app/api/sources/[id]/review/route.ts"),
    text("supabase/migrations/20260818000300_source_review_truth.sql"),
  ]);

  assert.match(migration, /crawler_checked_at remains the timestamp of a retrieval\/inspection/i);
  assert.match(route, /reviewed_at:\s*reviewedAt/);
  assert.match(route, /reviewed_by:\s*viewer\.id/);
  assert.match(route, /crawler_access:\s*body\.crawlerAccess/);
  assert.doesNotMatch(route, /crawler_checked_at:\s*reviewedAt/);
  assert.doesNotMatch(route, /supabaseRest\(`sources\?[^`]+`[\s\S]*?body:\s*\{\s*crawler_access:\s*body\.crawlerAccess/);
});
