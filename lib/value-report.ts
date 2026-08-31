import type { OutcomeLedgerRecord, OutcomeLedgerStep, OutcomeState } from "./outcome-ledger.ts";

export type ValueReport = {
  period: { since: string | null; until: string | null };
  issuesIdentified: number;
  actionsApproved: number;
  actionsCompleted: number;
  itemsRemeasured: number;
  improvementsObserved: number;
  regressionsObserved: number;
  mixedChangesObserved: number;
  noMaterialChangeObserved: number;
  incomparableMeasurements: number;
  competitiveGapsAddressed: number;
  unresolvedItems: number;
  economicValue: {
    status: "not_demonstrated";
    amount: null;
    currency: null;
    basis: string;
  };
  operationalValue: string;
};

export type ExecutiveDigest = {
  whatChanged: string;
  needsAttention: string;
  competitorMovement: string;
  openActions: string;
  interventionObservation: string;
  reviewNext: string;
};

export type PeriodSummary = {
  label: "Weekly" | "Monthly" | "Quarterly";
  days: 7 | 30 | 90;
  report: ValueReport;
};

const step = (record: OutcomeLedgerRecord, key: OutcomeLedgerStep["key"]) => record.steps.find((item) => item.key === key);
const validTime = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

const inWindow = (value: string | null | undefined, since: number | null, until: number | null) => {
  const time = validTime(value);
  if (time === null) return since === null && until === null;
  if (since !== null && time <= since) return false;
  if (until !== null && time > until) return false;
  return true;
};

function countStep(records: OutcomeLedgerRecord[], key: OutcomeLedgerStep["key"], since: number | null, until: number | null) {
  return records.filter((record) => {
    const item = step(record, key);
    return Boolean(item?.done && inWindow(item.at, since, until));
  }).length;
}

function countOutcome(records: OutcomeLedgerRecord[], state: OutcomeState, since: number | null, until: number | null) {
  return records.filter((record) => {
    const item = step(record, "outcome");
    return record.comparisonEligible === true && record.outcomeState === state && Boolean(item?.done) && inWindow(item?.at, since, until);
  }).length;
}

/**
 * Derive operational value from the immutable outcome chain. This function has
 * no currency input by design: economic value remains explicitly unproven until
 * a separately verified economic record exists. It never converts chronology,
 * movement, or completed work into dollar ROI.
 */
export function buildBusinessValueReport(
  records: OutcomeLedgerRecord[],
  period: { since?: string | null; until?: string | null } = {},
): ValueReport {
  const since = validTime(period.since || null);
  const until = validTime(period.until || null);
  const actionsCompleted = countStep(records, "completion", since, until);
  const itemsRemeasured = countStep(records, "measurement", since, until);
  const improvementsObserved = countOutcome(records, "improved", since, until);
  const regressionsObserved = countOutcome(records, "regressed", since, until);
  const mixedChangesObserved = countOutcome(records, "mixed", since, until);
  const noMaterialChangeObserved = countOutcome(records, "no_material_change", since, until);
  const incomparableMeasurements = records.filter((record) => {
    const item = step(record, "measurement");
    return record.outcomeState === "incomparable" && Boolean(item?.done) && inWindow(item?.at, since, until);
  }).length;
  const competitiveGapsAddressed = records.filter((record) => {
    const item = step(record, "completion");
    return record.assetType === "comparison_brief" && Boolean(item?.done) && inWindow(item?.at, since, until);
  }).length;
  const unresolvedItems = records.filter((record) => {
    const recommendation = step(record, "recommendation");
    if (!inWindow(recommendation?.at, since, until) && (since !== null || until !== null)) return false;
    return !step(record, "completion")?.done || !step(record, "outcome")?.done;
  }).length;

  return {
    period: { since: period.since || null, until: period.until || null },
    issuesIdentified: countStep(records, "observation", since, until),
    actionsApproved: countStep(records, "action", since, until),
    actionsCompleted,
    itemsRemeasured,
    improvementsObserved,
    regressionsObserved,
    mixedChangesObserved,
    noMaterialChangeObserved,
    incomparableMeasurements,
    competitiveGapsAddressed,
    unresolvedItems,
    economicValue: {
      status: "not_demonstrated",
      amount: null,
      currency: null,
      basis: "The Outcome Ledger contains operational evidence and eligible before-and-after observations, not verified economic attribution. No dollar ROI is inferred.",
    },
    operationalValue: `${actionsCompleted} completed action${actionsCompleted === 1 ? "" : "s"}; ${itemsRemeasured} later measurement${itemsRemeasured === 1 ? "" : "s"}; ${improvementsObserved} eligible improvement${improvementsObserved === 1 ? "" : "s"}; ${regressionsObserved} eligible regression${regressionsObserved === 1 ? "" : "s"}.`,
  };
}

export function buildExecutiveDigest(records: OutcomeLedgerRecord[]): ExecutiveDigest {
  const report = buildBusinessValueReport(records);
  const open = records.filter((record) => step(record, "action")?.done && !step(record, "completion")?.done);
  const awaitingMeasurement = records.filter((record) => step(record, "completion")?.done && !step(record, "measurement")?.done);
  const incomparable = records.filter((record) => record.outcomeState === "incomparable");
  const regressions = records.filter((record) => record.comparisonEligible === true && record.outcomeState === "regressed");
  const eligibleOutcomes = records.filter((record) => record.comparisonEligible === true && step(record, "outcome")?.done);
  const earliestDue = open
    .filter((record) => validTime(record.dueAt) !== null)
    .slice()
    .sort((a, b) => (validTime(a.dueAt) || Number.MAX_SAFE_INTEGER) - (validTime(b.dueAt) || Number.MAX_SAFE_INTEGER))[0];

  const changedParts = [
    report.improvementsObserved ? `${report.improvementsObserved} eligible improvement${report.improvementsObserved === 1 ? "" : "s"}` : "",
    report.regressionsObserved ? `${report.regressionsObserved} eligible regression${report.regressionsObserved === 1 ? "" : "s"}` : "",
    report.mixedChangesObserved ? `${report.mixedChangesObserved} mixed result${report.mixedChangesObserved === 1 ? "" : "s"}` : "",
    report.noMaterialChangeObserved ? `${report.noMaterialChangeObserved} unchanged eligible result${report.noMaterialChangeObserved === 1 ? "" : "s"}` : "",
  ].filter(Boolean);

  return {
    whatChanged: changedParts.length ? `${changedParts.join("; ")}.` : "No eligible observed outcome is available yet; Foremention is withholding trend language until exact comparison requirements are met.",
    needsAttention: regressions.length || incomparable.length || report.unresolvedItems
      ? `${regressions.length} regression${regressions.length === 1 ? "" : "s"}, ${incomparable.length} incomparable measurement${incomparable.length === 1 ? "" : "s"}, and ${report.unresolvedItems} unresolved item${report.unresolvedItems === 1 ? "" : "s"} need review.`
      : "No unresolved outcome-ledger item currently requires attention.",
    competitorMovement: report.competitiveGapsAddressed
      ? `${report.competitiveGapsAddressed} competitive comparison gap${report.competitiveGapsAddressed === 1 ? "" : "s"} had a completed intervention. Current competitor movement still belongs to the exact Comparisons evidence layer.`
      : "No completed competitive-gap intervention is recorded here. Current competitor movement remains sourced from exact Comparisons, not inferred from this ledger.",
    openActions: open.length ? `${open.length} approved action${open.length === 1 ? "" : "s"} remain open${open.filter((record) => record.ownerId).length ? `; ${open.filter((record) => record.ownerId).length} have an assigned owner` : "; none has a recorded owner"}.` : "No approved action is waiting for recorded completion.",
    interventionObservation: eligibleOutcomes.length ? `${eligibleOutcomes.length} completed intervention${eligibleOutcomes.length === 1 ? "" : "s"} coincide with an eligible later measurement. This is observed association only, not causal attribution.` : "No completed intervention currently has an eligible later outcome comparison.",
    reviewNext: earliestDue
      ? `Review “${earliestDue.title}” next; it is the earliest dated open action${earliestDue.dueAt ? ` (${new Date(earliestDue.dueAt).toLocaleDateString("en-GB")})` : ""}.`
      : regressions[0]
        ? `Review the regression on “${regressions[0].title}” before approving another intervention.`
        : incomparable[0]
          ? `Review comparison eligibility for “${incomparable[0].title}”; the later measurement was retained but no outcome comparison was calculated.`
          : awaitingMeasurement[0]
            ? `Remeasure “${awaitingMeasurement[0].title}” under the exact eligible protocol before judging the intervention.`
            : "Review the latest Recommendation Record and exact Comparison before deciding the next intervention.",
  };
}

const isoDaysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export function buildPeriodSummaries(records: OutcomeLedgerRecord[], now = new Date()): PeriodSummary[] {
  const until = now.toISOString();
  return [
    { label: "Weekly", days: 7, report: buildBusinessValueReport(records, { since: isoDaysAgo(now, 7), until }) },
    { label: "Monthly", days: 30, report: buildBusinessValueReport(records, { since: isoDaysAgo(now, 30), until }) },
    { label: "Quarterly", days: 90, report: buildBusinessValueReport(records, { since: isoDaysAgo(now, 90), until }) },
  ];
}
