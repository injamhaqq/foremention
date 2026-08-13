import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260813090000_source_snapshot_privilege_hardening.sql",
  import.meta.url,
);

test("Source Snapshot customer roles cannot mutate or truncate immutable history", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /revoke all privileges on table public\.source_snapshots from anon, authenticated/i);
  assert.match(sql, /revoke all privileges on table public\.source_snapshot_observations from anon, authenticated/i);
  assert.match(sql, /grant select, insert on table public\.source_snapshots to authenticated/i);
  assert.match(sql, /grant select, insert on table public\.source_snapshot_observations to authenticated/i);

  assert.doesNotMatch(sql, /grant\s+(?:all|update|delete|truncate|references|trigger)[^;]*\b(?:anon|authenticated)\b/i);
});
