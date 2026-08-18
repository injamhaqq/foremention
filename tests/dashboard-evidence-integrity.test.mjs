import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("human source review is persisted separately from automated crawler checks", async () => {
  const [migration, data, reviewRoute, sourceMapPage, sourceDetail, sourceTable] = await Promise.all([
    text("supabase/migrations/20260818000300_source_review_truth.sql"),
    text("lib/data.ts"),
    text("app/api/sources/[id]/review/route.ts"),
    text("app/app/source-map/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("components/source-map-table.tsx"),
  ]);

  assert.match(migration, /add column if not exists reviewed_at timestamptz/i);
  assert.match(migration, /add column if not exists reviewed_by uuid/i);
  assert.match(migration, /action\s*=\s*'source\.reviewed'/i);
  assert.match(data, /source_map_entries\?select=[^`]*reviewed_at,reviewed_by/i);
  assert.match(data, /reviewedAt:\s*row\.reviewed_at\s*\?/i);
  assert.doesNotMatch(data, /reviewedAt:\s*row\.source!?\.crawler_checked_at/i);
  assert.match(reviewRoute, /reviewed_at:\s*reviewedAt/);
  assert.match(reviewRoute, /reviewed_by:\s*viewer\.id/);
  assert.match(sourceMapPage, /!entry\.reviewedAt/);
  assert.match(sourceMapPage, /entry\.reviewedAt\s*&&\s*!entry\.clientPresent/);
  assert.match(sourceDetail, /const reviewed = Boolean\(source\.reviewedAt\)/);
  assert.match(sourceTable, /!entry\.reviewedAt\s*&&\s*!entry\.clientPresent/);
  assert.match(sourceTable, /entry\.reviewedAt\s*\?\s*entry\.clientPresent/);
});

test("customer-facing source metrics can be scoped to the exact baseline run", async () => {
  const [data, analytics, intelligence] = await Promise.all([
    text("lib/data.ts"),
    text("app/app/analytics/page.tsx"),
    text("lib/intelligence-loop.ts"),
  ]);
  assert.match(data, /loadSourceMap\(viewer[^)]*runId/i);
  assert.match(data, /run_id=eq\.\$\{encodeURIComponent\(options\.runId\)\}/);
  assert.match(analytics, /loadSourceMap\(viewer,\s*\{\s*runId:\s*latest\.id\s*\}\)/);
  assert.match(intelligence, /source_maps\?select=id[^`]*run_id=eq\.\$\{[^}]+\}/);
});

test("decision-readiness uses finalized runs, verified answers, and safe comparable movement", async () => {
  const [data, page] = await Promise.all([
    text("lib/data.ts"),
    text("app/app/decision-lab/page.tsx"),
  ]);
  const decisionStart = data.indexOf("export async function loadDecisionSignal");
  const decisionEnd = data.indexOf("export async function loadTeam", decisionStart);
  const decision = data.slice(decisionStart, decisionEnd);
  assert.match(decision, /status=in\.\(complete,partial\)/);
  assert.doesNotMatch(decision, /status=in\.\(review,complete,partial\)/);
  assert.match(decision, /review_status=eq\.verified/);
  assert.match(decision, /run_id=eq\.\$\{latest\.id\}/);
  assert.match(page, /loadSafeWeeklyIntelligence/);
  assert.match(page, /intelligence\.previous/);
});

test("competitor metrics exclude unreviewed answers and withhold unsafe run-to-run movement", async () => {
  const [data, page] = await Promise.all([
    text("lib/data.ts"),
    text("components/competitor-tracker.tsx"),
  ]);
  const start = data.indexOf("export async function loadCompetitorTracking");
  const end = data.indexOf("export async function loadQuestionPerformance", start);
  const competitor = data.slice(start, end);
  assert.match(competitor, /status=in\.\(complete,partial\)/);
  assert.match(competitor, /review_status=eq\.verified/);
  assert.match(competitor, /entry\.reviewedAt/);
  assert.doesNotMatch(competitor, /entry\.crawlerAccess\s*!==\s*["']unknown["']/);
  assert.doesNotMatch(page, /Change from the previous collection/);
  assert.match(page, /Comparable change|No exact comparable pair/i);
});

test("overview and analytics surface a newer failed or running collection without erasing the prior baseline", async () => {
  const [overview, analytics] = await Promise.all([
    text("app/app/page.tsx"),
    text("app/app/analytics/page.tsx"),
  ]);
  assert.match(overview, /const newestRun = runs\[0\]/);
  assert.match(overview, /newestRun\?\.status === "failed"/);
  assert.match(overview, /newestRun\?\.status === "running"|newestRun\?\.status === "queued"/);
  assert.match(analytics, /newestRun\?\.status === "failed"/);
  assert.match(analytics, /prior reviewed baseline|previous reviewed baseline/i);
});

test("question evidence yield keeps edited prompt text as a separate measurement identity", async () => {
  const data = await text("lib/data.ts");
  const start = data.indexOf("export async function loadQuestionPerformance");
  const end = data.indexOf("export async function loadWorkspaceSummary", start);
  const questionPerformance = data.slice(start, end);
  assert.match(questionPerformance, /prompt_key.*prompt_text|prompt_text.*prompt_key/s);
  assert.match(questionPerformance, /JSON\.stringify\(\[row\.prompt_key,\s*row\.prompt_text/);
});

test("Outcome Ledger never treats a pending-review run as a finalized baseline", async () => {
  const ledger = await text("lib/outcome-ledger.ts");
  assert.match(ledger, /\["complete",\s*"partial"\]\.includes\(run\.status\)/);
  assert.doesNotMatch(ledger, /\["review",\s*"complete",\s*"partial"\]\.includes\(run\.status\)/);
});
