import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("isolated customer-decision database fixture is rollback-only and wired after clean CI migrations", async () => {
  const [sql, ci] = await Promise.all([
    text("../scripts/verify-isolated-reviewed-second-cycle.sql"),
    text("../.github/workflows/ci.yml"),
  ]);
  assert.match(sql, /^\\set ON_ERROR_STOP on/m);
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^rollback;$/m);
  assert.match(sql, /^set local statement_timeout = '30s';$/m);
  assert.match(ci, /supabase db start\s*\n\s*supabase db reset/);
  assert.match(ci, /docker exec -i supabase_db_foremention-mvp psql[^\n]+< scripts\/verify-isolated-reviewed-second-cycle\.sql/);
  assert.doesNotMatch(sql, /(?:https?:\/\/(?:api|www)\.|service_role|supabase db push|migration repair)/i);
});

test("DB fixture tests five fixed questions, evidenced approval, recorded execution and strictly comparable follow-up", async () => {
  const sql = await text("../scripts/verify-isolated-reviewed-second-cycle.sql");
  assert.match(sql, /generate_series\(1,5\)/);
  assert.match(sql, /status='verified'/);
  assert.match(sql, /Resolution submitted without linked reviewed evidence/);
  assert.match(sql, /Change Specification submitted without evidence/);
  assert.match(sql, /review_decision='approved'/);
  assert.match(sql, /insert into public\.change_execution_assets/);
  assert.match(sql, /"retrievalVersion":"fixture-1"/);
  assert.match(sql, /'fixture-methodology-v1'/);
  assert.match(sql, /update public\.runs\s+set status='complete'/);
  assert.match(sql, /#>>'\{brandPresencePct,delta\}'/);
  assert.match(sql, /does not establish/);
  assert.match(sql, /'incompatible-market'/);
  assert.match(sql, /Changed market incorrectly accepted as comparable/);
  assert.match(sql, /fixture-mock/);
});

test("isolated fixture cannot be passed off as real customer or browser/provider acceptance", async () => {
  const sql = await text("../scripts/verify-isolated-reviewed-second-cycle.sql");
  for (const notice of [
    "NON-PRODUCTION ONLY", "NOT a browser/API journey",
    "no provider is called", "NOT", "fixture.invalid",
    "NOT", "rollback;",
  ]) {
    assert.ok(sql.includes(notice), notice);
  }
  assert.doesNotMatch(sql, /\b(?:customer-paid|pilot-converted|external-verified|provider-live-success)\b/i);
});
