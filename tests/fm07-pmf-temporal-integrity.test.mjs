import assert from "node:assert/strict";
import test from "node:test";

import { activationMilestoneTimestamp, completedActivationStageAt } from "../lib/pmf-activation-boundary.ts";
import { deriveMonthlyActivationCohorts } from "../lib/pmf-cohorts.ts";
import { derivePmfMetrics } from "../lib/pmf-metrics.ts";

const NOW = new Date("2026-08-30T00:00:00.000Z");

function account(changes = {}) {
  return {
    organizationId: "org-synthetic",
    includedInCompanyKpis: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    workspaceConfiguredAt: "2026-06-01T01:00:00.000Z",
    fiveQuestionsApprovedAt: "2026-06-01T02:00:00.000Z",
    firstMeasurementAt: "2026-06-02T00:00:00.000Z",
    firstRecordReviewedAt: "2026-06-02T02:00:00.000Z",
    firstActionCreatedAt: "2026-06-02T03:00:00.000Z",
    firstActionAssignedAt: "2026-06-02T04:00:00.000Z",
    secondComparableCycleAt: "2026-06-16T00:00:00.000Z",
    activityAt: ["2026-07-12T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
    designPartnerAcceptedAt: "2026-06-01T00:00:00.000Z",
    payingStartedAt: "2026-06-20T00:00:00.000Z",
    billingVerified: true,
    ...changes,
  };
}

test("valid chronological first-party facts retain existing activation and comparable-cycle measures", () => {
  const facts = account();
  const metrics = derivePmfMetrics([facts], NOW);
  assert.equal(metrics.activation_rate.value, 100);
  assert.equal(metrics.first_record_review_rate.value, 100);
  assert.equal(metrics.action_creation_rate.value, 100);
  assert.equal(metrics.second_cycle_rate.value, 100);
  assert.equal(metrics.design_partner_conversion.value, 100);
  assert.equal(metrics.paid_conversion.value, 100);
  assert.ok(activationMilestoneTimestamp(facts, NOW.getTime()) !== null);
  assert.equal(deriveMonthlyActivationCohorts([facts], NOW).length, 1);
});

test("reversed activation milestones fail closed in both direct PMF and monthly cohort reports", () => {
  const cases = [
    { firstMeasurementAt: "2026-06-01T01:30:00.000Z" },
    { firstRecordReviewedAt: "2026-06-01T20:00:00.000Z" },
    { firstActionCreatedAt: "2026-06-02T01:00:00.000Z" },
    { firstActionAssignedAt: "2026-06-02T02:30:00.000Z" },
    { workspaceConfiguredAt: "2026-05-30T00:00:00.000Z" },
  ];
  for (const change of cases) {
    const facts = account(change);
    const metrics = derivePmfMetrics([facts], NOW);
    assert.equal(metrics.activation_rate.value, 0, JSON.stringify(change));
    assert.equal(metrics.second_cycle_rate.status, "insufficient_data", JSON.stringify(change));
    assert.deepEqual(deriveMonthlyActivationCohorts([facts], NOW), [], JSON.stringify(change));
    assert.equal(activationMilestoneTimestamp(facts, NOW.getTime()), null);
  }
});

test("intermediate review/action metrics require every earlier completed workflow stage", () => {
  for (const changes of [
    { workspaceConfiguredAt: null },
    { fiveQuestionsApprovedAt: null },
    { fiveQuestionsApprovedAt: "2026-06-03T00:00:00.000Z" },
    { firstMeasurementAt: "2026-05-31T00:00:00.000Z" },
    { workspaceConfiguredAt: "2026-09-01T00:00:00.000Z" },
  ]) {
    const facts = account(changes);
    const metrics = derivePmfMetrics([facts], NOW);
    assert.equal(completedActivationStageAt(facts, NOW.getTime(), 3), null, JSON.stringify(changes));
    assert.equal(metrics.first_record_review_rate.status, "insufficient_data", JSON.stringify(changes));
    assert.equal(metrics.action_creation_rate.status, "insufficient_data", JSON.stringify(changes));
    assert.equal(metrics.time_to_first_value.sampleSize, 0, JSON.stringify(changes));
    assert.equal(metrics.activation_rate.value, 0, JSON.stringify(changes));
  }
});

test("legitimate incomplete activation can count reached stages without inventing activation", () => {
  const facts = account({
    firstActionAssignedAt: null,
    secondComparableCycleAt: null,
  });
  const metrics = derivePmfMetrics([facts], NOW);
  assert.ok(completedActivationStageAt(facts, NOW.getTime(), 5) !== null);
  assert.equal(completedActivationStageAt(facts, NOW.getTime(), 6), null);
  assert.equal(metrics.first_record_review_rate.value, 100);
  assert.equal(metrics.action_creation_rate.value, 100);
  assert.equal(metrics.activation_rate.value, 0);
  assert.equal(metrics.second_cycle_rate.status, "insufficient_data");
  assert.deepEqual(deriveMonthlyActivationCohorts([facts], NOW), []);
});

test("invalid or future as-of timestamps cannot establish an intermediate workflow stage", () => {
  const facts = account();
  for (const stageCount of [0, -1, 2.5, 7]) {
    assert.equal(completedActivationStageAt(facts, NOW.getTime(), stageCount), null);
  }
  assert.equal(completedActivationStageAt(facts, Number.NaN, 3), null);
  assert.equal(completedActivationStageAt(facts, NOW.getTime(), 3) !== null, true);
});

test("future-dated events cannot count as activation, reviewed first value or cohort membership", () => {
  for (const field of [
    "workspaceConfiguredAt",
    "fiveQuestionsApprovedAt",
    "firstMeasurementAt",
    "firstRecordReviewedAt",
    "firstActionCreatedAt",
    "firstActionAssignedAt",
  ]) {
    const facts = account({ [field]: "2026-09-03T00:00:00.000Z" });
    const metrics = derivePmfMetrics([facts], NOW);
    assert.equal(metrics.activation_rate.value, 0, field);
    assert.deepEqual(deriveMonthlyActivationCohorts([facts], NOW), [], field);
    assert.equal(activationMilestoneTimestamp(facts, NOW.getTime()), null);
    if (field === "firstMeasurementAt") {
      assert.equal(metrics.first_record_review_rate.status, "insufficient_data");
    }
    if (field === "firstRecordReviewedAt") {
      assert.equal(metrics.first_record_review_rate.value, 0);
    }
  }
});

test("second cycle must follow activation and must occur by the as-of date", () => {
  for (const secondComparableCycleAt of [
    "2026-06-02T02:30:00.000Z",
    "2026-09-01T00:00:00.000Z",
  ]) {
    const facts = account({ secondComparableCycleAt });
    const metrics = derivePmfMetrics([facts], NOW);
    assert.equal(metrics.activation_rate.value, 100);
    assert.equal(metrics.second_cycle_rate.value, 0, secondComparableCycleAt);
    assert.equal(metrics.time_to_second_cycle.status, "insufficient_data");
    assert.equal(metrics.time_to_second_cycle.sampleSize, 0);
  }
});

test("future or pre-acceptance payment does not count as design-partner conversion", () => {
  for (const payingStartedAt of [
    "2026-05-31T00:00:00.000Z",
    "2026-09-30T00:00:00.000Z",
  ]) {
    const metrics = derivePmfMetrics([account({ payingStartedAt })], NOW);
    assert.equal(metrics.design_partner_conversion.value, 0);
    if (payingStartedAt.startsWith("2026-09")) {
      assert.equal(metrics.paid_conversion.value, 0);
    }
  }
  assert.equal(
    derivePmfMetrics([account({ designPartnerAcceptedAt: "2026-09-20T00:00:00.000Z" })], NOW)
      .design_partner_conversion.status,
    "insufficient_data",
  );
});

test("unclassified and explicitly excluded organizations never enter temporal KPI denominators", () => {
  const ignored = account({ includedInCompanyKpis: false });
  const metrics = derivePmfMetrics([ignored], NOW);
  assert.equal(metrics.activation_rate.status, "insufficient_data");
  assert.equal(metrics.second_cycle_rate.status, "insufficient_data");
  assert.equal(metrics.wau_accounts.status, "insufficient_data");
  assert.deepEqual(deriveMonthlyActivationCohorts([ignored], NOW), []);
});

test("a fully matured five-account sample preserves reportable median durations", () => {
  const facts = Array.from({ length: 5 }, (_, index) => account({
    organizationId: `org-${index}`,
  }));
  const metrics = derivePmfMetrics(facts, NOW);
  assert.equal(metrics.time_to_first_value.status, "available");
  assert.equal(metrics.time_to_first_value.sampleSize, 5);
  assert.equal(metrics.time_to_second_cycle.status, "available");
  assert.equal(metrics.time_to_second_cycle.sampleSize, 5);
});
