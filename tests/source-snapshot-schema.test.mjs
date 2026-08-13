import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260813080000_source_snapshot_engine.sql",
  import.meta.url,
);

test("source snapshot schema preserves immutable bounded page evidence", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create table if not exists public\.source_snapshots/i);
  assert.match(sql, /previous_snapshot_id uuid references public\.source_snapshots\(id\)/i);
  assert.match(sql, /canonical_url text not null/i);
  assert.match(sql, /final_url text not null/i);
  assert.match(sql, /retrieved_at timestamptz not null/i);
  assert.match(sql, /http_status integer/i);
  assert.match(sql, /content_type text/i);
  assert.match(sql, /page_title text/i);
  assert.match(sql, /content_length integer/i);
  assert.match(sql, /content_signature text/i);
  assert.match(sql, /content_hash text/i);
  assert.match(sql, /representation_version text not null default 'bounded-visible-text-v1'/i);
  assert.match(sql, /change_state text not null default 'unknown'/i);
  assert.doesNotMatch(sql, /\bpage_body\b|\braw_page\b|\bpage_text\b/i, "snapshot storage must not retain broad page bodies by default");

  assert.match(sql, /create table if not exists public\.source_snapshot_observations/i);
  assert.match(sql, /source_observation_id uuid not null references public\.source_observations\(id\)/i);
  assert.match(sql, /observation\.organization_id = snapshot\.organization_id/i);
  assert.match(sql, /observation\.source_id = snapshot\.source_id/i);
});

test("source snapshot RLS is tenant-scoped and append-only for authenticated customers", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /alter table public\.source_snapshots enable row level security/i);
  assert.match(sql, /alter table public\.source_snapshot_observations enable row level security/i);
  assert.match(sql, /public\.is_org_member\(source_snapshots\.organization_id\)/i);
  assert.match(sql, /public\.has_org_role\(source_snapshots\.organization_id/i);
  assert.match(sql, /s\.organization_id = source_snapshots\.organization_id/i);
  assert.match(sql, /r\.organization_id = source_snapshots\.organization_id/i);
  assert.match(sql, /previous\.organization_id = source_snapshots\.organization_id/i);
  assert.match(sql, /previous\.source_id = source_snapshots\.source_id/i);

  assert.match(sql, /grant select, insert on public\.source_snapshots to authenticated/i);
  assert.match(sql, /revoke update, delete on public\.source_snapshots from authenticated/i);
  assert.match(sql, /grant select, insert on public\.source_snapshot_observations to authenticated/i);
  assert.match(sql, /revoke update, delete on public\.source_snapshot_observations from authenticated/i);
  assert.doesNotMatch(sql, /source_snapshots_write_analyst/i, "snapshot history must not get a generic mutable all-operations policy");
});
