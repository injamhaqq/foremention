import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildOutcomeLedger } from "../lib/outcome-ledger.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const asset = {
  id: "00000000-0000-4000-8000-0000000000a1",
  opportunity_id: "00000000-0000-4000-8000-0000000000b1",
  source_id: "00000000-0000-4000-8000-0000000000c1",
  baseline_run_id: "00000000-0000-4000-8000-0000000000d1",
  asset_type: "comparison_brief",
  title: "Comparison brief: a reviewed source omits the customer",
  problem_statement: "A reviewed comparison source names competitors but not the customer",
  status: "applied",
  review_decision: "approved",
  submitted_at: "2026-08-02T00:00:00.000Z",
  approved_at: "2026-08-03T00:00:00.000Z",
  decision_at: "2026-08-03T00:00:00.000Z",
  approval_note: "Approved after checking every linked source.",
  applied_at: "2026-08-04T00:00:00.000Z",
  application_reference: "https://github.com/example/site/pull/412",
  application_note: "Merged into the customer-owned marketing site.",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-04T00:00:00.000Z",
};
const baselineRun = { id: "00000000-0000-4000-8000-0000000000d1", status: "complete", brand_presence_pct: 20, first_mention_pct: 10, citation_count: 4, new_source_count: 1, completed_at: "2026-08-01T00:00:00.000Z" };
const followUpRun = { id: "00000000-0000-4000-8000-0000000000d2", status: "complete", brand_presence_pct: 35, first_mention_pct: 12, citation_count: 6, new_source_count: 3, completed_at: "2026-08-11T00:00:00.000Z" };
const followUp = {
  id: "00000000-0000-4000-8000-0000000000e1",
  resolution_asset_id: asset.id,
  baseline_run_id: baselineRun.id,
  rerun_id: followUpRun.id,
  status: "complete",
  requested_at: "2026-08-05T00:00:00.000Z",
  completed_at: "2026-08-11T00:00:00.000Z",
  outcome: {},
  limitation: "Observed before-and-after association only; Foremention does not claim the applied asset caused the change.",
};

test("the outcome ledger links measurement, approval, application, and remeasurement in order", () => {
  const [record] = buildOutcomeLedger({ assets: [asset], followUps: [followUp], runs: [baselineRun, followUpRun] });
  assert.deepEqual(record.steps.map((step) => step.key), ["measured", "drafted", "approved", "applied", "remeasured"]);
  assert.ok(record.steps.every((step) => step.done));
  assert.equal(record.steps[3].detail, asset.application_reference);
  assert.equal(record.measurementStatus, "complete");
});

test("comparable deltas are derived from persisted run metrics only", () => {
  const [record] = buildOutcomeLedger({ assets: [asset], followUps: [followUp], runs: [baselineRun, followUpRun] });
  assert.equal(record.comparison.brandPresencePct.delta, 15);
  assert.equal(record.comparison.citationCount.delta, 2);
  assert.equal(record.comparison.newSourceCount.delta, 2);
  assert.match(record.comparison.interpretation, /does not establish.*caused/i);
});

test("a stored database outcome is preferred over any recomputed comparison", () => {
  const stored = { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, interpretation: "This asset caused the improvement.", brandPresencePct: { before: 20, after: 99, delta: 79 }, firstMentionPct: { before: 0, after: 0, delta: 0 }, citationCount: { before: 0, after: 0, delta: 0 }, newSourceCount: { before: 0, after: 0, delta: 0 } };
  const [record] = buildOutcomeLedger({ assets: [asset], followUps: [{ ...followUp, outcome: stored }], runs: [baselineRun, followUpRun] });
  assert.equal(record.comparison.brandPresencePct.delta, 79);
  assert.match(record.comparison.interpretation, /does not establish.*caused/i);
  assert.doesNotMatch(record.comparison.interpretation, /caused the improvement/i);
});

test("a malformed or mismatched stored outcome is never displayed as evidence", () => {
  const malformed = { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, interpretation: "Guaranteed result.", brandPresencePct: { before: 20, after: 99, delta: 79 } };
  const wrongRun = { ...malformed, baselineRunId: "00000000-0000-4000-8000-000000000099" };
  for (const outcome of [malformed, wrongRun]) {
    const [record] = buildOutcomeLedger({ assets: [asset], followUps: [{ ...followUp, outcome }], runs: [baselineRun, followUpRun] });
    assert.equal(record.comparison.brandPresencePct.delta, 15);
    assert.match(record.comparison.interpretation, /does not establish.*caused/i);
  }
});

test("a stored comparison is withheld when the recorded rerun is not complete", () => {
  const stored = { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, brandPresencePct: { before: 20, after: 35, delta: 15 }, firstMentionPct: { before: 10, after: 12, delta: 2 }, citationCount: { before: 4, after: 6, delta: 2 }, newSourceCount: { before: 1, after: 3, delta: 2 } };
  const [record] = buildOutcomeLedger({ assets: [asset], followUps: [{ ...followUp, outcome: stored }], runs: [baselineRun, { ...followUpRun, status: "review" }] });
  assert.equal(record.comparison, null);
  assert.equal(record.steps[4].done, false);
  assert.match(record.steps[4].detail, /could not be validated/);
});

test("an incomplete chain never fabricates a comparison or an applied location", () => {
  const draft = { ...asset, status: "draft", review_decision: "pending", submitted_at: null, approved_at: null, decision_at: null, approval_note: null, applied_at: null, application_reference: null };
  const [record] = buildOutcomeLedger({ assets: [draft], followUps: [], runs: [baselineRun] });
  assert.equal(record.comparison, null);
  assert.equal(record.measurementStatus, "not_requested");
  assert.deepEqual(record.steps.filter((step) => step.done).map((step) => step.key), ["measured", "drafted"]);
  assert.match(record.steps[3].detail, /Not recorded as applied yet/);
  assert.match(record.limitation, /does not claim the applied asset caused the change/);
});

test("a queued or failed remeasurement stays explicit instead of showing an outcome", () => {
  for (const status of ["requested", "queued", "failed", "cancelled"]) {
    const [record] = buildOutcomeLedger({ assets: [asset], followUps: [{ ...followUp, status, completed_at: null, rerun_id: status === "requested" ? null : followUpRun.id }], runs: [baselineRun, followUpRun] });
    assert.equal(record.comparison, null, `${status} must not produce a comparison`);
    assert.equal(record.measurementStatus, status);
    assert.match(record.steps[4].detail, new RegExp(status));
  }
});

test("a baseline identifier without a readable reviewed run is not called measured", () => {
  const [record] = buildOutcomeLedger({ assets: [asset], followUps: [], runs: [] });
  assert.equal(record.steps[0].done, false);
  assert.match(record.steps[0].detail, /No readable finalized reviewed baseline run/);
});

test("the ledger page is tenant-scoped, demo-isolated, and free of outcome promises", async () => {
  const page = await text("app/app/outcomes/page.tsx");
  assert.match(page, /requireViewer\("\/app\/outcomes"\)/);
  assert.match(page, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(page, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(page, /viewer\.mode === "demo"/);
  assert.doesNotMatch(page, /inngest|getProvider\(|service_role/);
  assert.doesNotMatch(page, /guarantee|rank you|will recommend|more traffic|increase revenue/i);
  assert.match(page, /never claims an applied asset caused/);
  assert.match(page, /records\.filter\(\(record\) => Boolean\(record\.comparison\)\)/);
});

test("a pending migration is an explainable state, not a crash or a silent empty page", async () => {
  const [restClient, route, page] = await Promise.all([
    text("lib/supabase-rest.ts"),
    text("app/api/resolutions/route.ts"),
    text("app/app/outcomes/page.tsx"),
  ]);
  assert.match(restClient, /export function isMissingRelationError/);
  assert.match(restClient, /42P01/);
  assert.match(restClient, /PGRST205/);
  assert.match(route, /isMissingRelationError\(error\)/);
  assert.match(route, /pending_migration/);
  assert.match(route, /status: 503/);
  assert.match(page, /if \(!isMissingRelationError\(error\)\) throw error/);
  assert.match(page, /Resolution records are not enabled yet/);
  assert.doesNotMatch(page, /catch\(\(\) => \[\]/);
});

test("only a missing relation degrades; other database failures still surface", async () => {
  const { isMissingRelationError, SupabaseRequestError } = await import("../lib/supabase-rest.ts");
  assert.equal(isMissingRelationError(new SupabaseRequestError(404, "missing", "PGRST205")), true);
  assert.equal(isMissingRelationError(new SupabaseRequestError(404, "missing", "42P01")), true);
  assert.equal(isMissingRelationError(new SupabaseRequestError(403, "permission denied", "42501")), false);
  assert.equal(isMissingRelationError(new SupabaseRequestError(500, "boom")), false);
  assert.equal(isMissingRelationError(new Error("network down")), false);
});

test("the Outcome Ledger is reachable and keeps an accessible loading state", async () => {
  const [navigation, loading] = await Promise.all([text("components/workspace-navigation.tsx"), text("app/app/outcomes/loading.tsx")]);
  assert.match(navigation, /\/app\/outcomes/);
  assert.match(navigation, /Outcome Ledger/);
  assert.match(loading, /WorkspaceListSkeleton/);
  assert.match(await text("app/app/outcomes/page.tsx"), /aria-label=\{`\$\{step\.label\}/);
});
