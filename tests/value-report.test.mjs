import assert from "node:assert/strict";
import test from "node:test";
import { buildBusinessValueReport, buildDecisionEvidenceSummary, buildExecutiveDigest, buildPeriodSummaries } from "../lib/value-report.ts";

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
  outcomeState: overrides.outcomeState || "higher_observed",
  confidence: "reviewed",
  confidenceBasis: "reviewed",
  limitations: ["No causal attribution."],
  limitation: "No causal attribution.",
});

test("business value reports operational facts without inventing dollar ROI", () => {
  const report = buildBusinessValueReport([
    record(),
    record({ id: "r2", assetType: "faq_evidence_brief", outcomeState: "lower_observed" }),
  ]);
  assert.equal(report.issuesIdentified, 2);
  assert.equal(report.actionsApproved, 2);
  assert.equal(report.actionsCompleted, 2);
  assert.equal(report.itemsRemeasured, 2);
  assert.equal(report.higherObserved, 1);
  assert.equal(report.lowerObserved, 1);
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

test("an incomparable later measurement counts as remeasured but never as directional evidence", () => {
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
  assert.equal(report.higherObserved, 0);
  assert.equal(report.lowerObserved, 0);
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


test("decision evidence summary distinguishes a complete inspectable chain from unfinished and incomparable work", () => {
  const complete = record({ id: "complete" });
  const awaiting = record({
    id: "awaiting",
    comparison: null,
    comparisonEligible: null,
    measurementStatus: "not_requested",
    outcomeState: "pending",
    steps: ["observation","evidence","recommendation","decision","action","owner","completion"].map((key) => step(key))
      .concat([step("measurement", false), step("outcome", false)]),
  });
  const incomparable = record({
    id: "incomparable",
    comparison: null,
    comparisonEligible: false,
    measurementStatus: "incomparable",
    outcomeState: "incomparable",
    steps: ["observation","evidence","recommendation","decision","action","owner","completion","measurement"].map((key) => step(key))
      .concat(step("outcome", false)),
  });
  const open = record({
    id: "open",
    comparison: null,
    comparisonEligible: null,
    measurementStatus: "not_requested",
    outcomeState: "pending",
    steps: ["observation","evidence","recommendation","decision","action","owner"].map((key) => step(key))
      .concat([step("completion", false), step("measurement", false), step("outcome", false)]),
  });
  const summary = buildDecisionEvidenceSummary([complete, awaiting, incomparable, open]);
  assert.deepEqual({
    totalRecords: summary.totalRecords,
    completeDecisionChains: summary.completeDecisionChains,
    executedAwaitingMeasurement: summary.executedAwaitingMeasurement,
    incomparableMeasurements: summary.incomparableMeasurements,
    openApprovedActions: summary.openApprovedActions,
    status: summary.status,
  }, {
    totalRecords: 4,
    completeDecisionChains: 1,
    executedAwaitingMeasurement: 1,
    incomparableMeasurements: 1,
    openApprovedActions: 1,
    status: "inspectable_chain_available",
  });
  assert.match(summary.statement, /1 inspectable decision-evidence chain/i);
  assert.match(summary.limitation, /does not prove causation, economic ROI, or independent customer value/i);
});

test("decision evidence summary refuses to call incomplete work proof", () => {
  const summary = buildDecisionEvidenceSummary([record({
    comparison: null,
    comparisonEligible: null,
    measurementStatus: "not_requested",
    outcomeState: "pending",
    steps: ["observation","evidence","recommendation","decision","action"].map((key) => step(key))
      .concat([step("owner", false), step("completion", false), step("measurement", false), step("outcome", false)]),
  })]);
  assert.equal(summary.completeDecisionChains, 0);
  assert.equal(summary.status, "chain_in_progress");
  assert.match(summary.statement, /No complete decision-evidence chain/i);
  assert.doesNotMatch(summary.statement, /impact achieved|ROI demonstrated|caused/i);
});
