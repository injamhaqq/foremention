import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = new URL("../supabase/migrations/20260813153000_reviewed_opportunity_bridge_unique.sql", import.meta.url);

test("route-less reviewed opportunities have a partial unique concurrency guard", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /create unique index if not exists opportunities_reviewed_source_bridge_unique/i);
  assert.match(sql, /on public\.opportunities \(project_id, source_id\)/i);
  assert.match(sql, /where source_route_id is null/i);
  assert.doesNotMatch(sql, /delete\s+from|update\s+public\.opportunities/i);
});
