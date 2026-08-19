// Relative .ts import so the node test runner can strip types and load this
// module directly, exactly as it already does for lib/resolution-engine.ts.
import { compareResolutionRuns, type ResolutionAssetType, type RunMeasurement } from "./resolution-engine.ts";

export type OutcomeLedgerAssetRow = {
  id: string;
  opportunity_id: string;
  source_id: string;
  baseline_run_id: string | null;
  asset_type: ResolutionAssetType;
  title: string;
  problem_statement: string;
  status: "draft" | "in_review" | "approved" | "applied";
  review_decision: "pending" | "approved" | "changes_requested" | "rejected";
  submitted_at: string | null;
  approved_at: string | null;
  decision_at: string | null;
  approval_note: string | null;
  applied_at: string | null;
  application_reference: string | null;
  application_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OutcomeLedgerFollowUpRow = {
  id: string;
  resolution_asset_id: string;
  baseline_run_id: string;
  rerun_id: string | null;
  status: "requested" | "queued" | "complete" | "failed" | "cancelled";
  requested_at: string;
  completed_at: string | null;
  outcome: Record<string, unknown>;
  limitation: string;
};

export type OutcomeLedgerRunRow = {
  id: string;
  status: string;
  brand_presence_pct: number | string | null;
  first_mention_pct: number | string | null;
  citation_count: number | string | null;
  new_source_count: number | string | null;
  completed_at: string | null;
};

export type OutcomeLedgerStep = {
  key: "measured" | "drafted" | "approved" | "applied" | "remeasured";
  label: string;
  done: boolean;
  at: string | null;
  detail: string;
};

export type OutcomeLedgerRecord = {
  id: string;
  title: string;
  problemStatement: string;
  assetType: ResolutionAssetType;
  status: OutcomeLedgerAssetRow["status"];
  steps: OutcomeLedgerStep[];
  applicationReference: string | null;
  applicationNote: string | null;
  comparison: ReturnType<typeof compareResolutionRuns> | null;
  measurementStatus: "not_requested" | "requested" | "queued" | "complete" | "failed" | "cancelled";
  limitation: string;
};

const DEFAULT_LIMITATION = "Observed before-and-after association only; Foremention does not claim the applied asset caused the change.";
const COMPARISON_INTERPRETATION = "Observed before-and-after association only. This record does not establish that the applied resolution caused the change.";

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMeasurement = (run: OutcomeLedgerRunRow): RunMeasurement => ({
  id: run.id,
  brandPresencePct: toNumber(run.brand_presence_pct),
  firstMentionPct: toNumber(run.first_mention_pct),
  citationCount: toNumber(run.citation_count),
  newSourceCount: toNumber(run.new_source_count),
  completedAt: run.completed_at,
});

const isComparableBaselineRun = (run: OutcomeLedgerRunRow | undefined) =>
  Boolean(run && ["complete", "partial"].includes(run.status));
const isComparableFollowUpRun = (run: OutcomeLedgerRunRow | undefined) =>
  Boolean(run && ["complete", "partial"].includes(run.status));

type MetricDelta = { before: number; after: number; delta: number };

const readMetricDelta = (value: unknown, range: "percentage" | "count"): MetricDelta | null => {
  if (!value || typeof value !== "object") return null;
  const metric = value as Record<string, unknown>;
  const before = typeof metric.before === "number" ? metric.before : Number.NaN;
  const after = typeof metric.after === "number" ? metric.after : Number.NaN;
  const delta = typeof metric.delta === "number" ? metric.delta : Number.NaN;
  if (![before, after, delta].every(Number.isFinite)) return null;
  if (range === "percentage" && (before < 0 || before > 100 || after < 0 || after > 100)) return null;
  if (range === "count" && (!Number.isInteger(before) || !Number.isInteger(after) || !Number.isInteger(delta) || before < 0 || after < 0)) return null;
  if (Math.abs((after - before) - delta) > 0.011) return null;
  return { before, after, delta };
};

/**
 * Treat persisted JSON as untrusted input. The database normally writes this
 * shape, but an older or malformed row must not crash the page, attach a
 * comparison to the wrong run, or replace Foremention's non-causal boundary.
 */
const readStoredComparison = (
  outcome: Record<string, unknown>,
  baselineRunId: string,
  followUpRunId: string | null,
): ReturnType<typeof compareResolutionRuns> | null => {
  if (!followUpRunId || outcome.baselineRunId !== baselineRunId || outcome.followUpRunId !== followUpRunId) return null;
  const brandPresencePct = readMetricDelta(outcome.brandPresencePct, "percentage");
  const firstMentionPct = readMetricDelta(outcome.firstMentionPct, "percentage");
  const citationCount = readMetricDelta(outcome.citationCount, "count");
  const newSourceCount = readMetricDelta(outcome.newSourceCount, "count");
  if (!brandPresencePct || !firstMentionPct || !citationCount || !newSourceCount) return null;
  const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
  return {
    baselineRunId,
    followUpRunId,
    baselineCompletedAt: timestamp(outcome.baselineCompletedAt),
    followUpCompletedAt: timestamp(outcome.followUpCompletedAt),
    brandPresencePct,
    firstMentionPct,
    citationCount,
    newSourceCount,
    interpretation: COMPARISON_INTERPRETATION,
  };
};

/**
 * Assemble one inspectable record per resolution asset: finalized baseline
 * measurement, drafted asset, customer approval, recorded application, and a
 * finalized comparable remeasurement. Reads persisted rows only; never calls a
 * provider and never upgrades an observed association into a causal claim.
 */
export function buildOutcomeLedger(input: {
  assets: OutcomeLedgerAssetRow[];
  followUps: OutcomeLedgerFollowUpRow[];
  runs: OutcomeLedgerRunRow[];
}): OutcomeLedgerRecord[] {
  const runById = new Map(input.runs.map((run) => [run.id, run]));
  const followUpsByAsset = new Map<string, OutcomeLedgerFollowUpRow[]>();
  for (const followUp of input.followUps) {
    followUpsByAsset.set(followUp.resolution_asset_id, [...(followUpsByAsset.get(followUp.resolution_asset_id) || []), followUp]);
  }

  return input.assets.map((asset) => {
    const followUp = (followUpsByAsset.get(asset.id) || []).slice().sort((a, b) =>
      b.requested_at.localeCompare(a.requested_at) || b.id.localeCompare(a.id)
    )[0] || null;
    const baseline = asset.baseline_run_id ? runById.get(asset.baseline_run_id) : undefined;
    const rerun = followUp?.rerun_id ? runById.get(followUp.rerun_id) : undefined;
    const storedCandidate = followUp?.status === "complete"
      ? readStoredComparison(followUp.outcome, followUp.baseline_run_id, followUp.rerun_id)
      : null;
    const storedComparison = storedCandidate
      && (!baseline || isComparableBaselineRun(baseline))
      && (!rerun || isComparableFollowUpRun(rerun))
      ? storedCandidate
      : null;
    const comparison = storedComparison
      || (followUp?.status === "complete" && isComparableBaselineRun(baseline) && isComparableFollowUpRun(rerun)
        ? compareResolutionRuns(toMeasurement(baseline as OutcomeLedgerRunRow), toMeasurement(rerun as OutcomeLedgerRunRow))
        : null);
    const baselineMeasured = isComparableBaselineRun(baseline) || Boolean(storedComparison);
    const decisionDetail = asset.review_decision === "changes_requested"
      ? "Reviewer requested changes."
      : asset.review_decision === "rejected"
        ? "Reviewer rejected this draft."
        : asset.approved_at
          ? asset.approval_note || "Approved by the workspace reviewer."
          : asset.submitted_at
            ? "Waiting for a reviewer decision."
            : "Not submitted for review yet.";
    const steps: OutcomeLedgerStep[] = [
      { key: "measured", label: "Problem measured", done: baselineMeasured, at: baseline?.completed_at || (baselineMeasured ? asset.created_at : null), detail: baselineMeasured ? "A finalized reviewed baseline run recorded the observed gap." : "No readable finalized reviewed baseline run is attached." },
      { key: "drafted", label: "Solution asset drafted", done: true, at: asset.created_at, detail: asset.title },
      { key: "approved", label: "Customer approval", done: Boolean(asset.approved_at), at: asset.approved_at || asset.decision_at, detail: decisionDetail },
      { key: "applied", label: "Applied in customer tools", done: Boolean(asset.applied_at), at: asset.applied_at, detail: asset.application_reference || "Not recorded as applied yet." },
      { key: "remeasured", label: "Comparable remeasurement", done: Boolean(comparison), at: comparison ? followUp?.completed_at || null : null, detail: followUp ? (comparison ? "The same buyer questions and providers were measured again in finalized runs." : followUp.status === "complete" ? "The follow-up finished, but its stored comparison could not be validated against finalized runs." : `Follow-up measurement is ${followUp.status}.`) : "No follow-up measurement requested yet." },
    ];
    return {
      id: asset.id,
      title: asset.title,
      problemStatement: asset.problem_statement,
      assetType: asset.asset_type,
      status: asset.status,
      steps,
      applicationReference: asset.application_reference,
      applicationNote: asset.application_note,
      comparison,
      measurementStatus: followUp?.status || "not_requested",
      limitation: followUp?.limitation || DEFAULT_LIMITATION,
    };
  });
}
