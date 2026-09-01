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
  limitations?: string[];
  status: "draft" | "in_review" | "approved" | "applied";
  review_decision: "pending" | "approved" | "changes_requested" | "rejected";
  created_by?: string | null;
  submitted_by?: string | null;
  submitted_at: string | null;
  approved_by?: string | null;
  approved_at: string | null;
  decision_by?: string | null;
  decision_at: string | null;
  approval_note: string | null;
  applied_by?: string | null;
  applied_at: string | null;
  application_reference: string | null;
  application_note: string | null;
  change_specification_id?: string | null;
  change_title?: string | null;
  created_at: string;
  updated_at: string;
};

export type OutcomeLedgerEvidenceRow = {
  id: string;
  resolution_asset_id: string;
  evidence_snapshot: Record<string, unknown>;
  created_at: string;
};

export type OutcomeLedgerOpportunityRow = {
  id: string;
  owner_id: string | null;
  due_at: string | null;
  next_action: string | null;
  status: string;
  updated_at: string | null;
};

export type OutcomeLedgerFollowUpRow = {
  id: string;
  resolution_asset_id: string;
  baseline_run_id: string;
  rerun_id: string | null;
  status: "requested" | "queued" | "complete" | "incomparable" | "failed" | "cancelled";
  requested_by?: string | null;
  requested_at: string;
  recorded_by?: string | null;
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

export type OutcomeLedgerStepKey =
  | "observation"
  | "evidence"
  | "recommendation"
  | "decision"
  | "action"
  | "owner"
  | "completion"
  | "measurement"
  | "outcome";

export type OutcomeLedgerStep = {
  key: OutcomeLedgerStepKey;
  label: string;
  done: boolean;
  at: string | null;
  actorId: string | null;
  detail: string;
};

export type OutcomeState = "improved" | "regressed" | "mixed" | "no_material_change" | "incomparable" | "pending";

export type OutcomeLedgerRecord = {
  id: string;
  recommendationRecordRunId: string | null;
  opportunityId: string;
  sourceId: string;
  changeSpecificationId: string | null;
  changeTitle: string | null;
  title: string;
  problemStatement: string;
  assetType: ResolutionAssetType;
  status: OutcomeLedgerAssetRow["status"];
  steps: OutcomeLedgerStep[];
  ownerId: string | null;
  dueAt: string | null;
  nextAction: string | null;
  applicationReference: string | null;
  applicationNote: string | null;
  comparison: ReturnType<typeof compareResolutionRuns> | null;
  comparisonEligible: boolean | null;
  measurementStatus: "not_requested" | OutcomeLedgerFollowUpRow["status"];
  outcomeState: OutcomeState;
  confidence: "reviewed" | "limited" | "not_assessed";
  confidenceBasis: string;
  limitations: string[];
  limitation: string;
};

const DEFAULT_LIMITATION = "Observed before-and-after association only. This record does not establish that the applied change caused the result.";
const COMPARISON_INTERPRETATION = "Observed before-and-after association only. This record does not establish that the applied change caused the result.";

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

function classifyOutcome(
  comparison: ReturnType<typeof compareResolutionRuns> | null,
  followUp: OutcomeLedgerFollowUpRow | null,
): OutcomeState {
  if (followUp?.status === "incomparable") return "incomparable";
  if (!comparison) return "pending";
  // Presence and first-mention movement are directional recommendation metrics.
  // Citation/source counts are reported as context, but more citations or new
  // sources are not automatically labelled a business improvement.
  const directional = [comparison.brandPresencePct.delta, comparison.firstMentionPct.delta];
  const positive = directional.some((delta) => delta > 0);
  const negative = directional.some((delta) => delta < 0);
  if (positive && negative) return "mixed";
  if (positive) return "improved";
  if (negative) return "regressed";
  return "no_material_change";
}

const uniqueLimitations = (...groups: Array<Array<string | null | undefined>>) =>
  Array.from(new Set(groups.flat().map((value) => value?.trim()).filter((value): value is string => Boolean(value))));

/**
 * Assemble one inspectable record per reviewed resolution. The chain remains
 * anchored to the baseline Recommendation Record run and verified evidence,
 * then records human decision/action/ownership/completion before any later
 * measurement. Reads persisted rows only; never calls a provider and never
 * upgrades chronology or association into a causal claim.
 */
export function buildOutcomeLedger(input: {
  assets: OutcomeLedgerAssetRow[];
  evidence?: OutcomeLedgerEvidenceRow[];
  opportunities?: OutcomeLedgerOpportunityRow[];
  followUps: OutcomeLedgerFollowUpRow[];
  runs: OutcomeLedgerRunRow[];
}): OutcomeLedgerRecord[] {
  const evidence = input.evidence || [];
  const opportunities = input.opportunities || [];
  const runById = new Map(input.runs.map((run) => [run.id, run]));
  const opportunityById = new Map(opportunities.map((row) => [row.id, row]));
  const evidenceByAsset = new Map<string, OutcomeLedgerEvidenceRow[]>();
  for (const row of evidence) evidenceByAsset.set(row.resolution_asset_id, [...(evidenceByAsset.get(row.resolution_asset_id) || []), row]);
  const followUpsByAsset = new Map<string, OutcomeLedgerFollowUpRow[]>();
  for (const followUp of input.followUps) {
    followUpsByAsset.set(followUp.resolution_asset_id, [...(followUpsByAsset.get(followUp.resolution_asset_id) || []), followUp]);
  }

  return input.assets.map((asset) => {
    const followUp = (followUpsByAsset.get(asset.id) || []).slice().sort((a, b) =>
      b.requested_at.localeCompare(a.requested_at) || b.id.localeCompare(a.id)
    )[0] || null;
    const linkedEvidence = (evidenceByAsset.get(asset.id) || []).filter((row) => row.evidence_snapshot?.verification === "verified");
    const opportunity = opportunityById.get(asset.opportunity_id) || null;
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
    const evidenceReviewed = linkedEvidence.length > 0;
    const comparisonEligible = comparison ? true : followUp?.status === "incomparable" ? false : null;
    const measurementComplete = Boolean(followUp && ["complete", "incomparable"].includes(followUp.status));
    const outcomeState = classifyOutcome(comparison, followUp);
    const decisionDetail = asset.review_decision === "changes_requested"
      ? "Reviewer requested changes."
      : asset.review_decision === "rejected"
        ? "Reviewer rejected this draft."
        : asset.approved_at
          ? asset.approval_note || "Approved by the workspace reviewer."
          : asset.submitted_at
            ? "Waiting for a reviewer decision."
            : "Not submitted for review yet.";
    const latestEvidenceAt = linkedEvidence.map((row) => row.created_at).filter(Boolean).sort().at(-1) || null;
    const limitations = uniqueLimitations(asset.limitations || [], [followUp?.limitation, DEFAULT_LIMITATION]);
    const confidence: OutcomeLedgerRecord["confidence"] = comparison && evidenceReviewed
      ? "reviewed"
      : baselineMeasured || evidenceReviewed
        ? "limited"
        : "not_assessed";
    const confidenceBasis = comparison && evidenceReviewed
      ? "Verified linked evidence and an eligible exact-protocol remeasurement are present. This supports an observed association, not causation."
      : baselineMeasured && evidenceReviewed
        ? "The baseline Recommendation Record and linked evidence are reviewed, but no eligible observed outcome is available yet."
        : baselineMeasured
          ? "A reviewed baseline exists, but this read does not contain a verified linked evidence record."
          : "No readable finalized reviewed baseline is available for this record.";

    const steps: OutcomeLedgerStep[] = [
      { key: "observation", label: "Observation", done: baselineMeasured, at: baseline?.completed_at || (baselineMeasured ? asset.created_at : null), actorId: null, detail: baselineMeasured ? `Recommendation Record ${asset.baseline_run_id || "baseline"} preserves the observed AI answer set.` : "No readable finalized reviewed Recommendation Record baseline is attached." },
      { key: "evidence", label: "Evidence", done: evidenceReviewed, at: latestEvidenceAt, actorId: null, detail: evidenceReviewed ? `${linkedEvidence.length} verified evidence link${linkedEvidence.length === 1 ? "" : "s"} preserved from the reviewed record.` : "No verified linked evidence is readable for this resolution." },
      { key: "recommendation", label: "Execution asset", done: true, at: asset.created_at, actorId: asset.created_by || null, detail: `${asset.asset_type.replaceAll("_", " ")}: ${asset.title}` },
      { key: "decision", label: "Decision", done: Boolean(asset.decision_at), at: asset.decision_at, actorId: asset.decision_by || null, detail: asset.change_specification_id ? `Change Specification decision context linked. ${decisionDetail}` : decisionDetail },
      { key: "action", label: "Action", done: Boolean(asset.approved_at), at: asset.approved_at, actorId: asset.approved_by || null, detail: asset.approved_at ? "The reviewed recommendation was approved as an action." : "No approved action is recorded yet." },
      { key: "owner", label: "Owner", done: Boolean(opportunity?.owner_id), at: opportunity?.updated_at || null, actorId: opportunity?.owner_id || null, detail: opportunity?.owner_id ? `Assigned owner${opportunity.due_at ? ` · due ${opportunity.due_at}` : ""}${opportunity.next_action ? ` · ${opportunity.next_action}` : ""}` : "No action owner is assigned." },
      { key: "completion", label: "Completion", done: Boolean(asset.applied_at), at: asset.applied_at, actorId: asset.applied_by || null, detail: asset.application_reference || "Not recorded as applied yet." },
      { key: "measurement", label: "Later measurement", done: measurementComplete, at: measurementComplete ? followUp?.completed_at || null : followUp?.requested_at || null, actorId: followUp?.recorded_by || followUp?.requested_by || null, detail: followUp ? (measurementComplete ? followUp.status === "incomparable" ? "A later measurement finished, but exact comparison eligibility failed closed." : "The same eligible measurement protocol was completed again." : `Follow-up measurement is ${followUp.status}.`) : "No follow-up measurement requested yet." },
      { key: "outcome", label: "Observed outcome", done: Boolean(comparison), at: comparison ? followUp?.completed_at || null : null, actorId: followUp?.recorded_by || null, detail: comparison ? `${outcomeState.replaceAll("_", " ")}. ${comparison.interpretation}` : followUp?.status === "incomparable" ? "Outcome comparison withheld because the later observation was not eligible for exact comparison." : "No eligible observed outcome is available yet." },
    ];

    return {
      id: asset.id,
      recommendationRecordRunId: asset.baseline_run_id,
      opportunityId: asset.opportunity_id,
      sourceId: asset.source_id,
      changeSpecificationId: asset.change_specification_id || null,
      changeTitle: asset.change_title || null,
      title: asset.title,
      problemStatement: asset.problem_statement,
      assetType: asset.asset_type,
      status: asset.status,
      steps,
      ownerId: opportunity?.owner_id || null,
      dueAt: opportunity?.due_at || null,
      nextAction: opportunity?.next_action || null,
      applicationReference: asset.application_reference,
      applicationNote: asset.application_note,
      comparison,
      comparisonEligible,
      measurementStatus: followUp?.status || "not_requested",
      outcomeState,
      confidence,
      confidenceBasis,
      limitations,
      limitation: followUp?.limitation || DEFAULT_LIMITATION,
    };
  });
}
