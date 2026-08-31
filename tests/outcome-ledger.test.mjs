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
  limitations: ["A reviewed source gap does not establish why an AI provider produced an answer."],
  status: "applied",
  review_decision: "approved",
  created_by: "00000000-0000-4000-8000-000000000011",
  submitted_by: "00000000-0000-4000-8000-000000000012",
  submitted_at: "2026-08-02T00:00:00.000Z",
  approved_by: "00000000-0000-4000-8000-000000000013",
  approved_at: "2026-08-03T00:00:00.000Z",
  decision_by: "00000000-0000-4000-8000-000000000013",
  decision_at: "2026-08-03T00:00:00.000Z",
  approval_note: "Approved after checking every linked source.",
  applied_by: "00000000-0000-4000-8000-000000000014",
  applied_at: "2026-08-04T00:00:00.000Z",
  application_reference: "https://github.com/example/site/pull/412",
  application_note: "Merged into the customer-owned marketing site.",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-04T00:00:00.000Z",
};
const evidence = [{ id: "00000000-0000-4000-8000-0000000000f1", resolution_asset_id: asset.id, evidence_snapshot: { verification: "verified" }, created_at: "2026-08-01T04:00:00.000Z" }];
const opportunity = [{ id: asset.opportunity_id, owner_id: "00000000-0000-4000-8000-000000000015", due_at: "2026-08-10T00:00:00.000Z", next_action: "Publish the reviewed comparison update", status: "in_progress", updated_at: "2026-08-03T02:00:00.000Z" }];
const baselineRun = { id: "00000000-0000-4000-8000-0000000000d1", status: "complete", brand_presence_pct: 20, first_mention_pct: 10, citation_count: 4, new_source_count: 1, completed_at: "2026-08-01T00:00:00.000Z" };
const followUpRun = { id: "00000000-0000-4000-8000-0000000000d2", status: "complete", brand_presence_pct: 35, first_mention_pct: 12, citation_count: 6, new_source_count: 3, completed_at: "2026-08-11T00:00:00.000Z" };
const followUp = {
  id: "00000000-0000-4000-8000-0000000000e1",
  resolution_asset_id: asset.id,
  baseline_run_id: baselineRun.id,
  rerun_id: followUpRun.id,
  status: "complete",
  requested_by: "00000000-0000-4000-8000-000000000016",
  requested_at: "2026-08-05T00:00:00.000Z",
  recorded_by: "00000000-0000-4000-8000-000000000016",
  completed_at: "2026-08-11T00:00:00.000Z",
  outcome: {},
  limitation: "Observed before-and-after association only; Foremention does not claim the applied asset caused the change.",
};

const build = (overrides = {}) => buildOutcomeLedger({
  assets: overrides.assets || [asset],
  evidence: overrides.evidence ?? evidence,
  opportunities: overrides.opportunities ?? opportunity,
  followUps: overrides.followUps ?? [followUp],
  runs: overrides.runs ?? [baselineRun, followUpRun],
});

test("the outcome ledger preserves the complete decision-to-outcome chain in order", () => {
  const [record] = build();
  assert.deepEqual(record.steps.map((item) => item.key), ["observation", "evidence", "recommendation", "decision", "action", "owner", "completion", "measurement", "outcome"]);
  assert.ok(record.steps.every((item) => item.done));
  assert.equal(record.recommendationRecordRunId, baselineRun.id);
  assert.equal(record.ownerId, opportunity[0].owner_id);
  assert.equal(record.steps.find((item) => item.key === "decision").actorId, asset.decision_by);
  assert.equal(record.steps.find((item) => item.key === "completion").actorId, asset.applied_by);
  assert.equal(record.comparisonEligible, true);
  assert.equal(record.outcomeState, "improved");
});

test("eligible deltas are derived only from persisted run metrics and stay non-causal", () => {
  const [record] = build();
  assert.equal(record.comparison.brandPresencePct.delta, 15);
  assert.equal(record.comparison.citationCount.delta, 2);
  assert.equal(record.comparison.newSourceCount.delta, 2);
  assert.match(record.comparison.interpretation, /does not establish.*caused/i);
  assert.equal(record.confidence, "reviewed");
  assert.match(record.confidenceBasis, /not causation/i);
});

test("a stored database outcome can provide metrics but never its own causal interpretation", () => {
  const stored = { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, interpretation: "This asset caused the improvement.", brandPresencePct: { before: 20, after: 99, delta: 79 }, firstMentionPct: { before: 10, after: 12, delta: 2 }, citationCount: { before: 4, after: 6, delta: 2 }, newSourceCount: { before: 1, after: 3, delta: 2 } };
  const [record] = build({ followUps: [{ ...followUp, outcome: stored }] });
  assert.equal(record.comparison.brandPresencePct.delta, 79);
  assert.match(record.comparison.interpretation, /does not establish.*caused/i);
  assert.doesNotMatch(record.comparison.interpretation, /caused the improvement/i);
});

test("malformed or mismatched stored outcomes never become displayed evidence", () => {
  const malformed = { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, interpretation: "Guaranteed result.", brandPresencePct: { before: 20, after: 99, delta: 79 } };
  const wrongRun = { ...malformed, baselineRunId: "00000000-0000-4000-8000-000000000099" };
  for (const outcome of [malformed, wrongRun]) {
    const [record] = build({ followUps: [{ ...followUp, outcome }] });
    assert.equal(record.comparison.brandPresencePct.delta, 15);
    assert.match(record.comparison.interpretation, /does not establish.*caused/i);
  }
});

test("an incomparable follow-up remains measured but fails closed before an outcome label", () => {
  const incomparable = { ...followUp, status: "incomparable", outcome: { baselineRunId: baselineRun.id, followUpRunId: followUpRun.id, interpretation: "Exact model changed." } };
  const [record] = build({ followUps: [incomparable] });
  assert.equal(record.comparison, null);
  assert.equal(record.comparisonEligible, false);
  assert.equal(record.outcomeState, "incomparable");
  assert.equal(record.steps.find((item) => item.key === "measurement").done, true);
  assert.equal(record.steps.find((item) => item.key === "outcome").done, false);
  assert.match(record.steps.find((item) => item.key === "outcome").detail, /withheld/i);
});

test("directional outcome labels do not treat citation volume as automatic business improvement", () => {
  const contextualOnly = { ...followUpRun, brand_presence_pct: 20, first_mention_pct: 10, citation_count: 20, new_source_count: 10 };
  const [record] = build({ runs: [baselineRun, contextualOnly] });
  assert.equal(record.outcomeState, "no_material_change");
});

test("an incomplete chain does not fabricate evidence, ownership, completion, or outcome", () => {
  const draft = { ...asset, status: "draft", review_decision: "pending", submitted_at: null, approved_at: null, decision_at: null, approval_note: null, applied_at: null, application_reference: null };
  const [record] = build({ assets: [draft], evidence: [], opportunities: [], followUps: [], runs: [baselineRun] });
  assert.equal(record.comparison, null);
  assert.equal(record.measurementStatus, "not_requested");
  assert.deepEqual(record.steps.filter((item) => item.done).map((item) => item.key), ["observation", "recommendation"]);
  assert.match(record.steps.find((item) => item.key === "completion").detail, /Not recorded as applied yet/);
  assert.match(record.limitation, /does not claim the applied asset caused the change/);
});

test("queued, failed, and cancelled measurement states stay explicit", () => {
  for (const status of ["requested", "queued", "failed", "cancelled"]) {
    const [record] = build({ followUps: [{ ...followUp, status, completed_at: status === "failed" || status === "cancelled" ? followUp.completed_at : null, rerun_id: status === "requested" ? null : followUpRun.id }], runs: [baselineRun, followUpRun] });
    assert.equal(record.comparison, null, `${status} must not produce a comparison`);
    assert.equal(record.measurementStatus, status);
    assert.equal(record.steps.find((item) => item.key === "measurement").done, false);
    assert.match(record.steps.find((item) => item.key === "measurement").detail, new RegExp(status));
  }
});

test("a baseline identifier without a readable reviewed run is not called an observation", () => {
  const [record] = build({ runs: [], followUps: [] });
  assert.equal(record.steps[0].done, false);
  assert.match(record.steps[0].detail, /No readable finalized reviewed Recommendation Record baseline/);
});

test("the ledger page is tenant-scoped, demo-isolated, executive-readable, and free of ROI promises", async () => {
  const page = await text("app/app/outcomes/page.tsx");
  assert.match(page, /requireViewer\("\/app\/outcomes"\)/);
  assert.match(page, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(page, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(page, /viewer\.mode === "demo"/);
  assert.doesNotMatch(page, /inngest|getProvider\(|service_role/);
  assert.doesNotMatch(page, /guarantee|rank you|will recommend|increase revenue/i);
  assert.match(page, /Economic ROI: not demonstrated/);
  assert.match(page, /Board-ready export/);
  assert.match(page, /What changed\?/);
  assert.match(page, /What needs attention\?/);
  assert.match(page, /Where are competitors moving\?/);
  assert.match(page, /What should we review next\?/);
  assert.match(page, /never claims an intervention caused/);
});

test("a pending migration is an explainable state, not a crash or silent empty page", async () => {
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
  assert.match(page, /Outcome records are not fully enabled yet/);
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

test("Outcome Ledger stays contextual to the five-object IA and keeps an accessible loading state", async () => {
  const [navigation, loading] = await Promise.all([text("components/workspace-navigation.tsx"), text("app/app/outcomes/loading.tsx")]);
  assert.match(navigation, /CONTEXTUAL_WORKSPACE_ROUTES/);
  assert.match(navigation, /\/app\/outcomes/);
  assert.match(navigation, /Outcome Ledger/);
  assert.match(loading, /WorkspaceListSkeleton/);
  assert.match(await text("app/app/outcomes/page.tsx"), /aria-label=\{`\$\{step\.label\}/);
});
