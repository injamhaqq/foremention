import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260813033833_suppress_legacy_ungated_movement_alerts.sql";

test("legacy chronological run differences cannot enter the customer notification feed", async () => {
  const migration = await text(migrationPath);
  assert.match(migration, /before insert on public\.notifications/i);
  assert.match(migration, /return null/);
  for (const prefix of ["brand_presence_changed", "new_sources", "lost_sources", "competitor_movement"]) {
    assert.match(migration, new RegExp(`${prefix.replaceAll("_", "_")}:`));
  }
  assert.match(migration, /delete from public\.notifications/i);
  assert.doesNotMatch(migration, /run_ready:%|run_failed:%|source_map_published:%/);
});

test("legacy competitor-overtook email is disabled before any delivery lookup or Resend call", async () => {
  const helper = await text("lib/workspace-email-alerts.ts");
  const guard = helper.indexOf('input.kind === "competitor_overtook"');
  const config = helper.indexOf("process.env.RESEND_API_KEY");
  const delivery = helper.indexOf("application_email_deliveries");
  assert.ok(guard >= 0);
  assert.ok(guard < config);
  assert.ok(guard < delivery);
  assert.match(helper, /exact-question\/provider\/model\/methodology gate/);
});

test("run-ready, failure, first-run, source-review and weekly operational notifications remain outside the suppression list", async () => {
  const [jobs, sourceReview, migration] = await Promise.all([
    text("lib/jobs/inngest.ts"),
    text("app/api/sources/[id]/review/route.ts"),
    text(migrationPath),
  ]);
  for (const event of ["run_ready", "run_failed", "first_run_completed", "weekly_digest"]) assert.match(jobs, new RegExp(event));
  assert.match(sourceReview, /brand_new_source/);
  assert.match(sourceReview, /brand_lost_source/);
  assert.doesNotMatch(migration, /first_run_completed:%|weekly_digest:%|brand_new_source:%|brand_lost_source:%/);
});
