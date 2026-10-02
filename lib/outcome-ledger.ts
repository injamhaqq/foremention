// Relative .ts import so the node test runner can strip types and load this
// module directly, exactly as it already does for lib/resolution-engine.ts.
import { compareResolutionRuns, type ResolutionAssetType, type RunMeasurement } from "./resolution-engine.ts";
import type { ExactComparability } from "./intelligence-comparability.ts";

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

export type OutcomeLedgerEvidenceRow = { id: string; resolution_asset_id: string; evidence_snapshot: Record<string, unknown>; created_at: string };
export type OutcomeLedgerOpportunityRow = { id: string; owner_id: string | null; due_at: string | null; next_action: string | null; status: string; updated_at: string | null };
export type OutcomeLedgerFollowUpRow = {
  id: string; resolution_asset_id: string; baseline_run_id: string; rerun_id: string | null;
  status: "requested" | "queued" | "complete" | "incomparable" | "failed" | "cancelled";
  requested_by?: string | null; requested_at: string; recorded_by?: string | null; completed_at: string | null; outcome: Record<string, unknown>; limitation: string;
};
export type OutcomeLedgerRunRow = { id: string; status: string; brand_presence_pct: number | string | null; first_mention_pct: number | string | null; citation_count: number | string | null; new_source_count: number | string | null; completed_at: string | null };

export type OutcomeLedgerStepKey = "observation" | "evidence" | "recommendation" | "decision" | "action" | "owner" | "completion" | "measurement" | "outcome";
export type OutcomeLedgerStep = { key: OutcomeLedgerStepKey; label: string; done: boolean; at: string | null; actorId: string | null; detail: string };
export type OutcomeState = "higher_observed" | "lower_observed" | "mixed_observed" | "no_directional_change" | "incomparable" | "pending";

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

const isComparableBaselineRun = (run: OutcomeLedgerRunRow | undefined) => Boolean(run && ["complete", "partial"].includes(run.status));
const isComparableFollowUpRun = (run: OutcomeLedgerRunRow | undefined) => Boolean(run && ["complete", "partial"].includes(run.status));

// A finalized run's aggregate metrics may still be absent or malformed on
// legacy/partial data. Number(null), Number("") and Number("   ") equal zero:
// never silently transform missing persisted values into a directional delta.
// The independent nine-field question/context gate is necessary but does not
// itself verify completeness of the four aggregate metric columns.
function validRunMetric(value: number | string | null | undefined, range: "percentage" | "count"): boolean {
  if ((typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && !value.trim())) return false;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  return range === "percentage"
    ? numeric >= 0 && numeric <= 100
    : Number.isSafeInteger(numeric) && numeric >= 0;
}
function hasCompleteAggregateMetrics(run: OutcomeLedgerRunRow | undefined): boolean {
  return Boolean(run
    && validRunMetric(run.brand_presence_pct, "percentage")
    && validRunMetric(run.first_mention_pct, "percentage")
    && validRunMetric(run.citation_count, "count")
    && validRunMetric(run.new_source_count, "count"));
}

// Reporting a post-action outcome requires a chronological *completed* source
// chain, not merely an exact question/context match. DB constraints enforce
// most of these conditions for new rows, but this independently protects
// archived rows, imports, stale replicas and executive/print read paths.
// Only explicitly offset-aware database timestamps count as evidence.
function parsedCompletedAt(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  // Date.parse normalizes impossible days (e.g. Feb 30 into March). Such
  // normalization must not turn forged source dates into eligible evidence.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]);
  const offsetHours = Number(match[10] || 0), offsetMinutes = Number(match[11] || 0);
  if (year < 1 || month < 1 || month > 12 || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    || hour > 23 || minute > 59 || second > 59
    || offsetHours > 14 || offsetMinutes > 59
    || (offsetHours === 14 && offsetMinutes !== 0)) return null;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : null;
}

function assessPostActionChronology(
  asset: OutcomeLedgerAssetRow,
  baseline: OutcomeLedgerRunRow | undefined,
  rerun: OutcomeLedgerRunRow | undefined,
  followUp: OutcomeLedgerFollowUpRow,
): { eligible: boolean; reason: string | null } {
  const fail = (reason: string) => ({ eligible: false, reason });
  if (asset.status !== "applied" || asset.review_decision !== "approved") {
    return fail("A directional post-action outcome requires a reviewed, approved and applied resolution.");
  }
  const before = parsedCompletedAt(baseline?.completed_at);
  const approved = parsedCompletedAt(asset.approved_at);
  const applied = parsedCompletedAt(asset.applied_at);
  const requested = parsedCompletedAt(followUp.requested_at);
  const after = parsedCompletedAt(rerun?.completed_at);
  const recorded = parsedCompletedAt(followUp.completed_at);
  if ([before, approved, applied, requested, after, recorded].some((part) => part === null)) {
    return fail("Complete source run, approval, application, request and follow-up timestamps were not all independently readable.");
  }
  // Safe after the preceding null guard.
  if (!(before! < applied! && approved! <= applied!
    && applied! <= requested! && requested! <= after! && after! <= recorded!)) {
    return fail("The saved measurement chronology cannot establish a baseline before the approved application and a later run completed after the follow-up request.");
  }
  // Never display a 'completed' post-action result whose recorded completion
  // lies in the future; allow a small operational clock skew.
  if (recorded! > Date.now() + 5 * 60 * 1000) {
    return fail("The follow-up completion timestamp is in the future; post-action evidence was withheld.");
  }
  return { eligible: true, reason: null };
}

type MetricDelta = { before: number; after: number; delta: number };

const readMetricDelta = (value: unknown, range: "percentage" | "count"): MetricDelta | null => {
  if (!value || typeof value !== "object") return null;
  const metric = value as Record<string, unknown>;
  const before = typeof metric.before === "number" ? metric.before : Number.NaN;
  const after = typeof metric.after === "number" ? metric.after : Number.NaN;
  const delta = typeof metric.delta === "number" ? metric.delta : Number.NaN;
  if (![before, after, delta].every(Number.isFinite)) return null;
  if (range === "percentage" && (before < 0 || before > 100 || after < 0 || after > 100)) return null;
  if (range === "count" && (!Number.isSafeInteger(before) || !Number.isSafeInteger(after) || !Number.isSafeInteger(delta) || before < 0 || after < 0)) return null;
  if (Math.abs((after - before) - delta) > 0.011) return null;
  return { before, after, delta };
};

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
  return { baselineRunId, followUpRunId, baselineCompletedAt: timestamp(outcome.baselineCompletedAt), followUpCompletedAt: timestamp(outcome.followUpCompletedAt), brandPresencePct, firstMentionPct, citationCount, newSourceCount, interpretation: COMPARISON_INTERPRETATION };
};

/**
 * A database follow-up outcome is constructed from persisted run aggregates at
 * finalization. If both source runs have complete readable aggregates, a stored
 * outcome claiming different metrics is an integrity conflict, not a second
 * source of truth to display in an executive report. Never silently choose the
 * favorable side of contradictory persisted evidence.
 */
function storedMatchesSourceTimestamps(
  outcome: Record<string, unknown>,
  baseline: OutcomeLedgerRunRow | undefined,
  rerun: OutcomeLedgerRunRow | undefined,
): boolean {
  // Independently compare even when old runs have NULL aggregate columns.
  // A malformed *present* saved timestamp is a conflict, not an omitted date.
  return ([
    ["baselineCompletedAt", baseline?.completed_at],
    ["followUpCompletedAt", rerun?.completed_at],
  ] as const).every(([key, runTimestamp]) => {
    const saved = outcome[key];
    if (saved === undefined || saved === null) return true; // older saved outcomes omitted timestamps
    return typeof saved === "string"
      && parsedCompletedAt(saved) !== null
      && parsedCompletedAt(saved) === parsedCompletedAt(runTimestamp);
  });
}

function storedMatchesRunAggregates(
  stored: ReturnType<typeof compareResolutionRuns>,
  current: ReturnType<typeof compareResolutionRuns>,
): boolean {
  const fields = ["brandPresencePct", "firstMentionPct", "citationCount", "newSourceCount"] as const;
  const metricsMatch = fields.every((field) => {
    const tolerance = field === "brandPresencePct" || field === "firstMentionPct" ? 0.011 : 0;
    return (["before", "after", "delta"] as const).every((part) =>
      Math.abs(stored[field][part] - current[field][part]) <= tolerance);
  });
  // A valid-looking persisted outcome must not substitute a different run's
  // timestamps, even if its percentage and count deltas happen to agree.
  const timestampsMatch = (["baselineCompletedAt", "followUpCompletedAt"] as const)
    .every((field) => stored[field] === null
      || (current[field] !== null
        && parsedCompletedAt(stored[field]) === parsedCompletedAt(current[field])));
  return metricsMatch && timestampsMatch;
}

function classifyOutcome(comparison: ReturnType<typeof compareResolutionRuns> | null, followUp: OutcomeLedgerFollowUpRow | null): OutcomeState {
  if (followUp?.status === "incomparable") return "incomparable";
  if (!comparison) return "pending";
  const directional = [comparison.brandPresencePct.delta, comparison.firstMentionPct.delta];
  const positive = directional.some((delta) => delta > 0);
  const negative = directional.some((delta) => delta < 0);
  if (positive && negative) return "mixed_observed";
  if (positive) return "higher_observed";
  if (negative) return "lower_observed";
  return "no_directional_change";
}

const uniqueLimitations = (...groups: Array<Array<string | null | undefined>>) => Array.from(new Set(groups.flat().map((value) => value?.trim()).filter((value): value is string => Boolean(value))));

/**
 * Assemble one inspectable record per reviewed resolution. Linked rows expose
 * Change Specification as the company decision and Resolution Asset as its
 * execution artifact. Legacy rows remain recommendations and are never given a
 * fabricated parent decision. Reads persisted rows only and never upgrades
 * chronology or association into a causal claim.
 */
export function buildOutcomeLedger(input: {
  assets: OutcomeLedgerAssetRow[];
  evidence?: OutcomeLedgerEvidenceRow[];
  opportunities?: OutcomeLedgerOpportunityRow[];
  followUps: OutcomeLedgerFollowUpRow[];
  runs: OutcomeLedgerRunRow[];
  contextParityByFollowUp: ReadonlyMap<string, ExactComparability>;
}): OutcomeLedgerRecord[] {
  const evidence = input.evidence || [];
  const opportunities = input.opportunities || [];
  const runById = new Map(input.runs.map((run) => [run.id, run]));
  const opportunityById = new Map(opportunities.map((row) => [row.id, row]));
  const evidenceByAsset = new Map<string, OutcomeLedgerEvidenceRow[]>();
  for (const row of evidence) evidenceByAsset.set(row.resolution_asset_id, [...(evidenceByAsset.get(row.resolution_asset_id) || []), row]);
  const followUpsByAsset = new Map<string, OutcomeLedgerFollowUpRow[]>();
  for (const followUp of input.followUps) followUpsByAsset.set(followUp.resolution_asset_id, [...(followUpsByAsset.get(followUp.resolution_asset_id) || []), followUp]);

  return input.assets.map((asset) => {
    const followUp = (followUpsByAsset.get(asset.id) || []).slice().sort((a, b) => b.requested_at.localeCompare(a.requested_at) || b.id.localeCompare(a.id))[0] || null;
    const linkedEvidence = (evidenceByAsset.get(asset.id) || []).filter((row) => row.evidence_snapshot?.verification === "verified");
    const opportunity = opportunityById.get(asset.opportunity_id) || null;
    const baseline = asset.baseline_run_id ? runById.get(asset.baseline_run_id) : undefined;
    const rerun = followUp?.rerun_id ? runById.get(followUp.rerun_id) : undefined;
    const contextCheck = followUp?.status === "complete"
      ? input.contextParityByFollowUp?.get(followUp.id)
        || { comparable: false, reason: "Independent material-context verification was unavailable." }
      : null;
    const pairMatchesAsset = Boolean(followUp && asset.baseline_run_id === followUp.baseline_run_id && followUp.rerun_id);
    const contextBlocked = followUp?.status === "complete" && (!pairMatchesAsset || contextCheck?.comparable === false);
    const contextLimitation = !contextBlocked
      ? null
      : !pairMatchesAsset
        ? "The follow-up baseline does not match this resolution asset."
        : contextCheck?.reason || "Material measurement context could not be independently verified.";
    const chronologyCheck = followUp?.status === "complete" && !contextBlocked
      ? assessPostActionChronology(asset, baseline, rerun, followUp)
      : null;
    const chronologyBlocked = Boolean(chronologyCheck && !chronologyCheck.eligible);
    const chronologyLimitation = chronologyBlocked ? chronologyCheck?.reason || "Measurement chronology was not independently verified." : null;
    const storedCandidate = followUp?.status === "complete" && !contextBlocked && !chronologyBlocked
      ? readStoredComparison(followUp.outcome, followUp.baseline_run_id, followUp.rerun_id) : null;
    // Persisted stored outcomes already pass the strict metric-shape check
    // above. A fallback comparison from run aggregates instead requires all
    // four independently readable, valid metrics on BOTH finalized runs.
    // Source runs must be independently readable and finalized, even when
    // legacy aggregate fields are missing and the stored outcome is valid.
    const storedComparison = storedCandidate && isComparableBaselineRun(baseline)
      && isComparableFollowUpRun(rerun) ? storedCandidate : null;
    const metricReady = isComparableBaselineRun(baseline) && isComparableFollowUpRun(rerun)
      && hasCompleteAggregateMetrics(baseline) && hasCompleteAggregateMetrics(rerun);
    const aggregateComparison = metricReady
      ? compareResolutionRuns(toMeasurement(baseline as OutcomeLedgerRunRow), toMeasurement(rerun as OutcomeLedgerRunRow))
      : null;
    const sourceTimestampConflict = Boolean(storedComparison && !storedMatchesSourceTimestamps(
      followUp?.outcome || {}, baseline, rerun,
    ));
    const aggregateConflict = sourceTimestampConflict || Boolean(storedComparison && aggregateComparison
      && !storedMatchesRunAggregates(storedComparison, aggregateComparison));
    const metricsBlocked = followUp?.status === "complete" && !contextBlocked
      && !storedComparison && !metricReady;
    const metricLimitation = metricsBlocked
      ? "Complete, valid baseline and follow-up aggregate metrics were unavailable; a directional comparison was withheld."
      : null;
    const conflictLimitation = aggregateConflict
      ? "The stored follow-up outcome conflicts with independently readable run aggregates or source completion timestamps; directional evidence was withheld pending an integrity review."
      : null;
    // A conflicting persisted outcome must not be replaced by a potentially
    // favorable fresh calculation or vice versa; surface the conflict.
    const comparison = !aggregateConflict && followUp?.status === "complete" && !contextBlocked && !chronologyBlocked
      ? aggregateComparison || (storedComparison ? {
          ...storedComparison,
          // Trust independent source-run timestamps even for a valid legacy
          // stored outcome whose aggregate columns cannot be fully read.
          baselineCompletedAt: baseline?.completed_at || null,
          followUpCompletedAt: rerun?.completed_at || null,
        } : null) : null;
    const baselineMeasured = isComparableBaselineRun(baseline);
    const evidenceReviewed = linkedEvidence.length > 0;
    const comparisonEligible = comparison ? true : (followUp?.status === "incomparable" || contextBlocked || chronologyBlocked || metricsBlocked || aggregateConflict) ? false : null;
    const measurementComplete = Boolean(followUp && ["complete", "incomparable"].includes(followUp.status));
    const outcomeState = contextBlocked || chronologyBlocked || metricsBlocked || aggregateConflict ? "incomparable" : classifyOutcome(comparison, followUp);
    const linkedChange = Boolean(asset.change_specification_id);
    const decisionDetail = asset.review_decision === "changes_requested" ? "Reviewer requested changes." : asset.review_decision === "rejected" ? "Reviewer rejected this draft." : asset.approved_at ? asset.approval_note || "Approved by the workspace reviewer." : asset.submitted_at ? "Waiting for a reviewer decision." : "Not submitted for review yet.";
    const latestEvidenceAt = linkedEvidence.map((row) => row.created_at).filter(Boolean).sort().at(-1) || null;
    const limitations = uniqueLimitations(asset.limitations || [], [followUp?.limitation, DEFAULT_LIMITATION, contextLimitation, chronologyLimitation, metricLimitation, conflictLimitation]);
    const confidence: OutcomeLedgerRecord["confidence"] = comparison && evidenceReviewed ? "reviewed" : baselineMeasured || evidenceReviewed ? "limited" : "not_assessed";
    const confidenceBasis = comparison && evidenceReviewed
      ? "Verified linked evidence and an eligible exact-protocol remeasurement are present. This supports an observed association, not causation."
      : baselineMeasured && evidenceReviewed
        ? "The baseline Recommendation Record and linked evidence are reviewed, but no eligible directional comparison is available yet."
        : baselineMeasured
          ? "A reviewed baseline exists, but this read does not contain a verified linked evidence record."
          : "No readable finalized reviewed baseline is available for this record.";

    const steps: OutcomeLedgerStep[] = [
      { key: "observation", label: "Observation", done: baselineMeasured, at: baseline?.completed_at || (baselineMeasured ? asset.created_at : null), actorId: null, detail: baselineMeasured ? `Recommendation Record ${asset.baseline_run_id || "baseline"} preserves the observed AI answer set.` : "No readable finalized reviewed Recommendation Record baseline is attached." },
      { key: "evidence", label: "Evidence", done: evidenceReviewed, at: latestEvidenceAt, actorId: null, detail: evidenceReviewed ? `${linkedEvidence.length} verified evidence link${linkedEvidence.length === 1 ? "" : "s"} preserved from the reviewed record.` : "No verified linked evidence is readable for this resolution." },
      { key: "recommendation", label: linkedChange ? "Execution asset" : "Recommendation", done: true, at: asset.created_at, actorId: asset.created_by || null, detail: `${asset.asset_type.replaceAll("_", " ")}: ${asset.title}` },
      { key: "decision", label: "Decision", done: Boolean(asset.decision_at), at: asset.decision_at, actorId: asset.decision_by || null, detail: linkedChange ? `Change Specification decision context linked. ${decisionDetail}` : decisionDetail },
      { key: "action", label: "Action", done: Boolean(asset.approved_at), at: asset.approved_at, actorId: asset.approved_by || null, detail: asset.approved_at ? linkedChange ? "The reviewed execution artifact was approved as an action beneath the Change Specification." : "The reviewed recommendation was approved as an action." : "No approved action is recorded yet." },
      { key: "owner", label: "Owner", done: Boolean(opportunity?.owner_id), at: opportunity?.updated_at || null, actorId: opportunity?.owner_id || null, detail: opportunity?.owner_id ? `Assigned owner${opportunity.due_at ? ` · due ${opportunity.due_at}` : ""}${opportunity.next_action ? ` · ${opportunity.next_action}` : ""}` : "No action owner is assigned." },
      { key: "completion", label: "Completion", done: Boolean(asset.applied_at), at: asset.applied_at, actorId: asset.applied_by || null, detail: asset.application_reference || "Not recorded as applied yet." },
      { key: "measurement", label: "Later measurement", done: measurementComplete, at: measurementComplete ? followUp?.completed_at || null : followUp?.requested_at || null, actorId: followUp?.recorded_by || followUp?.requested_by || null, detail: followUp ? (measurementComplete ? (followUp.status === "incomparable" || contextBlocked || chronologyBlocked || metricsBlocked || aggregateConflict) ? "A later measurement finished, but independently checked exact comparison eligibility failed closed." : "The same eligible measurement protocol was completed again." : `Follow-up measurement is ${followUp.status}.`) : "No follow-up measurement requested yet." },
      { key: "outcome", label: "Observed direction", done: Boolean(comparison), at: comparison ? followUp?.completed_at || null : null, actorId: followUp?.recorded_by || null, detail: comparison ? `${outcomeState.replaceAll("_", " ")}. ${comparison.interpretation}` : (followUp?.status === "incomparable" || contextBlocked || chronologyBlocked || metricsBlocked || aggregateConflict) ? "Directional comparison withheld because the later observation was not eligible for independently verified exact comparison." : "No eligible directional comparison is available yet." },
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
      limitation: [followUp?.limitation || DEFAULT_LIMITATION, contextLimitation, chronologyLimitation, metricLimitation, conflictLimitation].filter(Boolean).join(" "),
    };
  });
}