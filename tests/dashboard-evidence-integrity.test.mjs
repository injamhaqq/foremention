import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("human source review is persisted separately from automated crawler checks", async () => {
  const [migration, integrity, reviewRoute, sourceMapPage, sourceDetail, sourceTable, safeIntelligence] = await Promise.all([
    text("supabase/migrations/20260818000300_source_review_truth.sql"),
    text("lib/evidence-integrity-data.ts"),
    text("app/api/sources/[id]/review/route.ts"),
    text("app/app/source-map/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("components/source-map-table.tsx"),
    text("lib/safe-intelligence.ts"),
  ]);

  assert.match(migration, /add column if not exists reviewed_at timestamptz/i);
  assert.match(migration, /add column if not exists reviewed_by uuid/i);
  assert.match(migration, /action\s*=\s*'source\.reviewed'/i);
  assert.match(integrity, /source_map_entries\?select=[^`]*reviewed_at,reviewed_by/i);
  assert.match(integrity, /reviewedAt:\s*row\.reviewed_at\s*\?/i);
  assert.doesNotMatch(integrity, /reviewedAt:\s*row\.source!?\.crawler_checked_at/i);
  assert.match(reviewRoute, /reviewed_at:\s*reviewedAt/);
  assert.match(reviewRoute, /reviewed_by:\s*viewer\.id/);
  assert.match(sourceMapPage, /!entry\.reviewedAt/);
  assert.match(sourceMapPage, /Boolean\(entry\.reviewedAt\)\s*&&\s*!entry\.clientPresent/);
  assert.match(sourceDetail, /const reviewed = Boolean\(source\.reviewedAt\)/);
  assert.match(sourceTable, /Boolean\(entry\.reviewedAt\)\s*&&\s*!entry\.clientPresent/);
  assert.match(sourceTable, /entry\.reviewedAt\s*\?\s*entry\.clientPresent/);
  assert.match(safeIntelligence, /Automated crawler checks do not count/);
});

test("customer-facing source metrics can be scoped to the exact baseline run", async () => {
  const [integrity, analytics, runDetail, safeIntelligence] = await Promise.all([
    text("lib/evidence-integrity-data.ts"),
    text("app/app/analytics/page.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("lib/safe-intelligence.ts"),
  ]);
  assert.match(integrity, /loadTruthfulSourceMap\([\s\S]*options:\s*\{\s*runId\?:/);
  assert.match(integrity, /run_id=eq\.\$\{encodeURIComponent\(options\.runId\)\}/);
  assert.match(analytics, /loadTruthfulSourceMap\(viewer,\s*\{\s*runId:\s*latest\.id\s*\}\)/);
  assert.match(runDetail, /loadTruthfulSourceMap\(viewer,\s*\{\s*runId:\s*run\.id\s*\}\)/);
  assert.match(safeIntelligence, /loadTruthfulSourceMap\(viewer,\s*\{\s*runId:\s*intelligence\.latest\.id\s*\}\)/);
});

test("decision-readiness uses finalized runs, verified answers, and safe comparable movement", async () => {
  const [integrity, page] = await Promise.all([
    text("lib/evidence-integrity-data.ts"),
    text("app/app/decision-lab/page.tsx"),
  ]);
  const decisionStart = integrity.indexOf("export async function loadTruthfulDecisionSignal");
  const decisionEnd = integrity.indexOf("export async function loadExactQuestionPerformance", decisionStart);
  const decision = integrity.slice(decisionStart, decisionEnd);
  assert.match(decision, /status=in\.\(complete,partial\)/);
  assert.doesNotMatch(decision, /status=in\.\(review,complete,partial\)/);
  assert.match(decision, /review_status=eq\.verified/);
  assert.match(decision, /run_id=eq\.\$\{latest\.id\}/);
  assert.match(page, /loadSafeWeeklyIntelligence/);
  assert.match(page, /intelligence\.previous/);
  assert.match(page, /exactComparablePair/);
});

test("competitor metrics exclude unreviewed answers and withhold unsafe run-to-run movement", async () => {
  const [integrity, page] = await Promise.all([
    text("lib/evidence-integrity-data.ts"),
    text("components/competitor-tracker.tsx"),
  ]);
  const start = integrity.indexOf("export async function loadTruthfulCompetitorTracking");
  const end = integrity.indexOf("function buildDecisionActions", start);
  const competitor = integrity.slice(start, end);
  assert.match(competitor, /status=in\.\(complete,partial\)/);
  assert.match(competitor, /review_status=eq\.verified/);
  assert.match(competitor, /Boolean\(entry\.reviewedAt\)/);
  assert.doesNotMatch(competitor, /entry\.crawlerAccess\s*!==\s*["']unknown["']/);
  assert.doesNotMatch(page, /Change from the previous collection/);
  assert.match(page, /Comparable change/);
  assert.match(page, /No exact comparable pair/);
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
  assert.match(analytics, /prior reviewed baseline/i);
});

test("question evidence yield keeps edited prompt text as a separate measurement identity", async () => {
  const integrity = await text("lib/evidence-integrity-data.ts");
  const start = integrity.indexOf("export async function loadExactQuestionPerformance");
  const questionPerformance = integrity.slice(start);
  assert.match(questionPerformance, /prompt_key,prompt_text/);
  assert.match(questionPerformance, /JSON\.stringify\(\[row\.prompt_key,\s*row\.prompt_text/);
});

test("Outcome Ledger never treats a pending-review run as a finalized baseline", async () => {
  const ledger = await text("lib/outcome-ledger.ts");
  assert.match(ledger, /\["complete",\s*"partial"\]\.includes\(run\.status\)/);
  assert.doesNotMatch(ledger, /\["review",\s*"complete",\s*"partial"\]\.includes\(run\.status\)/);
});

test("exports never serialize unreviewed defaults as reviewed brand facts", async () => {
  const route = await text("app/api/export/source-map/route.ts");
  assert.match(route, /human_reviewed/);
  assert.match(route, /row\.reviewedAt\s*\?\s*row\.clientPresent\s*:\s*"unreviewed"/);
  assert.match(route, /row\.reviewedAt\s*\?\s*row\.route\s*:\s*"unreviewed"/);
});
