import assert from "node:assert/strict";
import test from "node:test";
import { deriveMonthlyActivationCohorts } from "../lib/pmf-cohorts.ts";
import { derivePmfMetrics } from "../lib/pmf-metrics.ts";

function account(overrides = {}) {
  return {
    organizationId: "org-1",
    includedInCompanyKpis: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    firstMeasurementAt: "2026-06-02T00:00:00.000Z",
    firstRecordReviewedAt: "2026-06-02T02:00:00.000Z",
    firstActionCreatedAt: "2026-06-02T03:00:00.000Z",
    firstActionAssignedAt: "2026-06-02T04:00:00.000Z",
    secondComparableCycleAt: "2026-06-16T00:00:00.000Z",
    activityAt: ["2026-07-12T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
    designPartnerAcceptedAt: "2026-06-01T00:00:00.000Z",
    payingStartedAt: null,
    billingVerified: false,
    ...overrides,
  };
}

test("PMF metrics fail closed when there is no real KPI-eligible cohort", () => {
  const metrics = derivePmfMetrics([], new Date("2026-08-30T00:00:00.000Z"));
  assert.equal(metrics.activation_rate.status, "insufficient_data");
  assert.equal(metrics.wau_accounts.status, "insufficient_data");
  assert.equal(metrics.paid_conversion.status, "insufficient_data");
});

test("activation requires the ownership boundary and paid conversion requires verified billing", () => {
  const unowned = account({ firstActionAssignedAt: null });
  const noBilling = derivePmfMetrics([unowned], new Date("2026-08-30T00:00:00.000Z"));
  assert.equal(noBilling.activation_rate.value, 0);
  assert.equal(noBilling.paid_conversion.status, "insufficient_data");

  const paid = account({ payingStartedAt: "2026-06-20T00:00:00.000Z", billingVerified: true });
  const withBilling = derivePmfMetrics([paid], new Date("2026-08-30T00:00:00.000Z"));
  assert.equal(withBilling.activation_rate.value, 100);
  assert.equal(withBilling.paid_conversion.value, 100);
  assert.equal(withBilling.design_partner_conversion.value, 100);
});

test("monthly activation cohorts report next-month retention only after the observation window closes", () => {
  const mature = account({ organizationId: "org-june" });
  const immature = account({
    organizationId: "org-august",
    createdAt: "2026-08-02T00:00:00.000Z",
    firstMeasurementAt: "2026-08-03T00:00:00.000Z",
    firstRecordReviewedAt: "2026-08-03T01:00:00.000Z",
    firstActionCreatedAt: "2026-08-03T02:00:00.000Z",
    firstActionAssignedAt: "2026-08-03T03:00:00.000Z",
    secondComparableCycleAt: null,
    activityAt: ["2026-08-20T00:00:00.000Z"],
    designPartnerAcceptedAt: null,
  });
  const cohorts = deriveMonthlyActivationCohorts([mature, immature], new Date("2026-08-30T00:00:00.000Z"));
  const june = cohorts.find((cohort) => cohort.cohortMonth === "2026-06");
  const august = cohorts.find((cohort) => cohort.cohortMonth === "2026-08");
  assert.deepEqual(june, { cohortMonth: "2026-06", activatedAccounts: 1, eligibleForNextMonthRetention: 1, retainedNextMonthAccounts: 1, nextMonthRetentionPct: 100 });
  assert.equal(august?.eligibleForNextMonthRetention, 0);
  assert.equal(august?.nextMonthRetentionPct, null);
});
