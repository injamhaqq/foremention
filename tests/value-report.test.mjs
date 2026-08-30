import assert from "node:assert/strict";
import test from "node:test";
import { buildBusinessValueReport, buildExecutiveDigest, buildPeriodSummaries } from "../lib/value-report.ts";

const at = "2026-08-28T12:00:00.000Z";
const step = (key, done = true, date = at) => ({ key, label: key, done, at: done ? date : null, actorId: null, detail: key });
const record = (overrides = {}) => ({
  id: overrides.id || "r1",
  recommendationRecordRunId: "run-1",
  opportunityId: "opp-1",
  sourceId: "source-1",
  title: overrides.title || "Reviewed comparison gap",
  problemStatement: "A reviewed gap",
  assetType: overrides.assetType || "comparison_brief",
  status: "applied",
  steps: overrides.steps || ["observation","evidence","recommendation","decision","action","owner","completion","measurement","outcome"].map((key) => step(key)),
  ownerId: overrides.ownerId === undefined ? "user-1" : overrides.ownerId,
  dueAt: overrides.dueAt || "2026-09-01T12:00:00.000Z",
  nextAction: "Review",
  applicationReference: "https://example.com/change",
  applicationNote: null,
  comparison: overrides.comparison === undefined ? {} : overrides.comparison,
  comparisonEligible: overrides.comparisonEligible === undefined ? true : overrides.comparisonEligible,
  measurementStatus: overrides.measurementStatus || "complete",
  outcomeState: overrides.outcomeState || "improved",
  confidence: "reviewed",
  confidenceBasis: "reviewed",
  limitations: ["No causal attribution."],
  limitation: "No causal attribution.",
});

test("business value reports operational facts without inventing dollar ROI", () => {
  const report = buildBusinessValueReport([
    record(),
    record({ id: "r2", assetType: "faq_evidence_brief", outcomeState: "regressed" }),
  ]);
  assert.equal(report.issuesIdentified, 2);
  assert.equal(report.actionsApproved, 2);
  assert.equal(report.actionsCompleted, 2);
  assert.equal(report.itemsRemeasured, 2);
  assert.equal(report.improvementsObserved, 1);
  assert.equal(report.regressionsObserved, 1);
  assert.equal(report.competitiveGapsAddressed, 1);
  assert.equal(report.unresolvedItems, 0);
  assert.deepEqual(report.economicValue, {
    status: "not_demonstrated",
    amount: null,
    currency: null,
    basis: report.economicValue.basis,
  });
  assert.match(report.economicValue.basis, /No dollar ROI is inferred/i);
});

test("an incomparable later measurement counts as remeasured but never as improvement or regression", () => {
  const incomparable = record({
    comparison: null,
    comparisonEligible: false,
    measurementStatus: "incomparable",
    outcomeState: "incomparable",
    steps: ["observation","evidence","recommendation","decision","action","owner","completion","measurement"].map((key) => step(key)).concat(step("outcome", false)),
  });
  const report = buildBusinessValueReport([incomparable]);
  assert.equal(report.itemsRemeasured, 1);
  assert.equal(report.incomparableMeasurements, 1);
  assert.equal(report.improvementsObserved, 0);
  assert.equal(report.regressionsObserved, 0);
  assert.equal(report.unresolvedItems, 1);
});

test("open approved work is surfaced as unresolved executive attention", () => {
  const openSteps = ["observation","evidence","recommendation","decision","action","owner"].map((key) => step(key))
    .concat([step("completion", false), step("measurement", false), step("outcome", false)]);
  const open = record({ id: "open", title: "Open comparison action", comparison: null, comparisonEligible: null, outcomeState: "pending", measurementStatus: "not_requested", steps: openSteps });
  const report = buildBusinessValueReport([open]);
  const digest = buildExecutiveDigest([open]);
  assert.equal(report.actionsApproved, 1);
  assert.equal(report.actionsCompleted, 0);
  assert.equal(report.unresolvedItems, 1);
  assert.match(digest.openActions, /1 approved action/);
  assert.match(digest.needsAttention, /1 unresolved item/);
  assert.match(digest.reviewNext, /Open comparison action/);
});

test("executive digest never upgrades eligible chronology to causation", () => {
  const digest = buildExecutiveDigest([record()]);
  assert.match(digest.interventionObservation, /observed association only, not causal attribution/i);
  assert.match(digest.competitorMovement, /Comparisons evidence layer/i);
});

test("weekly, monthly, and quarterly summaries use the requested windows", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");
  const recent = record({ id: "recent" });
  const oldSteps = ["observation","evidence","recommendation","decision","action","owner","completion","measurement","outcome"].map((key) => step(key, true, "2026-06-01T12:00:00.000Z"));
  const old = record({ id: "old", steps: oldSteps });
  const periods = buildPeriodSummaries([recent, old], now);
  assert.deepEqual(periods.map((item) => item.label), ["Weekly", "Monthly", "Quarterly"]);
  assert.equal(periods[0].report.actionsCompleted, 1);
  assert.equal(periods[1].report.actionsCompleted, 1);
  assert.equal(periods[2].report.actionsCompleted, 1);
});
