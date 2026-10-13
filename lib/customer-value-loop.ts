/**
 * Chat04 customer value loop contract (CV-05, A14, A15, A28 leads).
 *
 * A pure, dependency-free state function over one project's persisted facts:
 *
 *   setup -> brand/competitors -> exact approved buyer questions
 *   -> permitted observation (optional; setup-only is a valid state)
 *   -> evidence / Recommendation Record human review
 *   -> saved human decision (Change Specification, explicit no-action, or
 *      reviewer disagreement) -> owner / action / date
 *   -> eligible later cycle (exact same contract) -> outcome / report / export.
 *
 * It never infers a missing fact. Unknown stays unknown, a partial or
 * interrupted collection is not zero visibility, and observed movement between
 * two comparable reviewed cycles is never causal uplift. A fixture clock
 * cannot make a later cycle "real": `laterCycleEvidence` records whether the
 * later run came from a real elapsed customer cycle or from a test fixture.
 *
 * Chat04 publishes this as the decision/cycle-eligibility interface for
 * FM-00, Chat06 (schedules/retries), Chat08 (decision events) and Chat09
 * (acceptance). Persistence and RLS stay with their owners.
 */
import {
  assessExactQuestionComparability,
  type ComparableMeasurementContext,
} from "./intelligence-comparability.ts";

export const LOOP_STAGES = [
  "setup_required",
  "questions_required",
  "setup_only",
  "collecting",
  "collection_interrupted",
  "review_required",
  "decision_required",
  "action_required",
  "awaiting_later_cycle",
  "later_cycle_not_comparable",
  "comparable_later_cycle",
] as const;
export type LoopStage = typeof LOOP_STAGES[number];

export type LoopRunStatus = "queued" | "running" | "review" | "partial" | "complete" | "failed" | "cancelled" | "interrupted";

export type LoopAnswerSlot = {
  promptKey: string;
  promptText: string | null;
  provider: string;
  model: string | null;
  /** Sampling identity (temperature/top-p/sample count) as recorded by Chat01; null = unavailable. */
  sampling: string | null;
  /** Observation method/lane as recorded by Chat01 (e.g. "provider_api"); null = unavailable. */
  method: string | null;
  measurementContext: ComparableMeasurementContext | null;
  /** Human review outcome of this answer's evidence. */
  reviewStatus: "verified" | "rejected" | "unreviewed";
};

export type LoopRun = {
  id: string;
  organizationId: string;
  projectId: string;
  status: LoopRunStatus;
  createdAt: string;
  methodologyVersion: string | null;
  /** Approved question-set version this run was dispatched against. */
  questionSetVersion: number | null;
  answers: LoopAnswerSlot[];
  /**
   * Real elapsed customer cycle vs. clock/test fixture. Fixtures never close CV-05.
   * "unknown" = not recorded (runs.cycle_origin NULL, e.g. pre-migration or a
   * service-role writer that did not declare it); unknown never closes proof either.
   */
  origin: "customer_cycle" | "fixture" | "unknown";
};

export type LoopDecisionKind = "change_specification" | "no_action" | "reviewer_disagreement";

export type LoopDecision = {
  id: string;
  organizationId: string;
  projectId: string;
  baselineRunId: string;
  kind: LoopDecisionKind;
  /** Change Specification decision state or explicit no-action/monitor choice. */
  decisionState: "DO_NOW" | "TEST_FIRST" | "DO_NOT_DO" | "MONITOR_ONLY" | "INSUFFICIENT_EVIDENCE";
  rationale: string;
  decidedBy: string;
  decidedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  ownerId: string | null;
  ownerRole: string | null;
  actionSummary: string | null;
  dueDate: string | null;
  /** Idempotency key used for the save; lets a failed ACK reconcile without duplicates. */
  saveKey: string;
};

export type LoopProjectSnapshot = {
  organizationId: string | null;
  projectId: string | null;
  brand: string | null;
  competitors: string[];
  approvedQuestions: { version: number; questions: string[]; approvedAt: string } | null;
  /** True only when the user explicitly opted into collection. */
  collectionRequested: boolean;
  runs: LoopRun[];
  decisions: LoopDecision[];
};

export type LaterCycleAssessment =
  | { status: "none" }
  | { status: "comparable"; baselineRunId: string; laterRunId: string; evidence: LoopRun["origin"]; exclusions: string[] }
  | { status: "not_comparable"; baselineRunId: string; laterRunId: string; reasons: string[]; exclusions: string[] };

export type LoopState = {
  stage: LoopStage;
  nextAction: string;
  blockers: string[];
  baselineRunId: string | null;
  decisionId: string | null;
  laterCycle: LaterCycleAssessment;
  /** Always "not_proven": a before/after observation is not causal uplift. */
  causation: "not_proven";
  /** CV-05 acceptance can only close on a real customer cycle, never a fixture. */
  closesCustomerProof: boolean;
};

const reviewedTerminal = new Set<LoopRunStatus>(["complete", "partial"]);
const inFlight = new Set<LoopRunStatus>(["queued", "running"]);
const interrupted = new Set<LoopRunStatus>(["failed", "cancelled", "interrupted"]);
const norm = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim();
const time = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

function scoped<T extends { organizationId: string; projectId: string }>(snapshot: LoopProjectSnapshot, rows: T[]) {
  return rows.filter((row) => row.organizationId === snapshot.organizationId && row.projectId === snapshot.projectId);
}

/** Decision completeness for the "owner / action / date" step. Does not judge correctness. */
export function decisionActionGaps(decision: LoopDecision): string[] {
  const gaps: string[] = [];
  if (!norm(decision.rationale)) gaps.push("rationale");
  if (!norm(decision.decidedBy) || !Number.isFinite(time(decision.decidedAt))) gaps.push("decidedBy/decidedAt");
  if (decision.kind === "change_specification") {
    if (!decision.approvedBy || !decision.approvedAt) gaps.push("approval");
    if (decision.decisionState === "DO_NOW" || decision.decisionState === "TEST_FIRST") {
      if (!norm(decision.ownerId) && !norm(decision.ownerRole)) gaps.push("owner");
      if (!norm(decision.actionSummary)) gaps.push("action");
      if (!decision.dueDate || !Number.isFinite(time(decision.dueDate))) gaps.push("dueDate");
    }
  }
  // An explicit no-action or reviewer disagreement is a complete human decision
  // once its rationale and author are persisted; it needs no fabricated owner.
  return gaps;
}

/**
 * Later-cycle eligibility: same approved question set, methodology, and the
 * exact question/provider/model/sampling/method/nine-field-context matrix of
 * human-verified answers. Rejected/unreviewed answers are listed as exclusions.
 */
export function assessLaterCycle(baseline: LoopRun, later: LoopRun): LaterCycleAssessment {
  const reasons: string[] = [];
  const exclusions: string[] = [];
  for (const run of [baseline, later]) {
    for (const answer of run.answers) {
      if (answer.reviewStatus !== "verified") {
        exclusions.push(`${run.id === baseline.id ? "baseline" : "later"}:${answer.promptKey}/${answer.provider} excluded (${answer.reviewStatus})`);
      }
    }
  }
  if (baseline.id === later.id) reasons.push("Choose two distinct reviewed collections.");
  if (baseline.organizationId !== later.organizationId || baseline.projectId !== later.projectId) {
    reasons.push("Both collections must belong to the same organization and project.");
  }
  if (!reviewedTerminal.has(baseline.status) || !reviewedTerminal.has(later.status)) {
    reasons.push("Both collections must have completed human review.");
  }
  if (!(time(baseline.createdAt) < time(later.createdAt))) {
    reasons.push("The later collection must be newer than the reviewed baseline.");
  }
  if (!baseline.methodologyVersion || baseline.methodologyVersion !== later.methodologyVersion) {
    reasons.push("Methodology version is missing or changed.");
  }
  if (baseline.questionSetVersion === null || baseline.questionSetVersion !== later.questionSetVersion) {
    reasons.push("The approved buyer-question set version is missing or changed.");
  }
  const verified = (run: LoopRun) => run.answers.filter((answer) => answer.reviewStatus === "verified");
  const base = verified(baseline);
  const next = verified(later);
  if (!base.length || !next.length) reasons.push("No human-verified answers are available in one collection.");
  const samplingKey = (rows: LoopAnswerSlot[]) => rows.map((row) => `${row.promptKey}\u0000${row.provider}\u0000${norm(row.sampling)}\u0000${norm(row.method)}`).sort();
  if ([...base, ...next].some((row) => !norm(row.sampling) || !norm(row.method))) {
    reasons.push("Sampling or observation-method provenance is unavailable for at least one verified answer.");
  } else if (samplingKey(base).join("|") !== samplingKey(next).join("|")) {
    reasons.push("Sampling settings or observation method changed between collections.");
  }
  if (base.length && next.length) {
    const exact = assessExactQuestionComparability(later.id, baseline.id, [
      ...base.map((row) => ({ ...row, runId: baseline.id })),
      ...next.map((row) => ({ ...row, runId: later.id })),
    ]);
    if (!exact.comparable && exact.reason) reasons.push(exact.reason);
  }
  if (reasons.length) return { status: "not_comparable", baselineRunId: baseline.id, laterRunId: later.id, reasons, exclusions };
  return { status: "comparable", baselineRunId: baseline.id, laterRunId: later.id, evidence: later.origin, exclusions };
}

/** Reconcile a decision save whose acknowledgement was lost (A15 "failed ACK"). */
export function reconcileDecisionSave(
  pending: { saveKey: string; baselineRunId: string },
  persisted: LoopDecision[],
): { outcome: "saved"; decisionId: string } | { outcome: "not_saved_retry_same_key" } | { outcome: "conflict"; reason: string } {
  const matches = persisted.filter((decision) => decision.saveKey === pending.saveKey);
  if (matches.length > 1) return { outcome: "conflict", reason: "More than one decision shares the save key; resolve manually before retrying." };
  if (matches.length === 1) {
    if (matches[0].baselineRunId !== pending.baselineRunId) {
      return { outcome: "conflict", reason: "The persisted decision for this save key belongs to a different baseline Record." };
    }
    return { outcome: "saved", decisionId: matches[0].id };
  }
  return { outcome: "not_saved_retry_same_key" };
}

export function computeCustomerValueLoop(snapshot: LoopProjectSnapshot): LoopState {
  const base = { blockers: [] as string[], baselineRunId: null as string | null, decisionId: null as string | null, laterCycle: { status: "none" } as LaterCycleAssessment, causation: "not_proven" as const, closesCustomerProof: false };
  if (!snapshot.organizationId || !snapshot.projectId) {
    return { ...base, stage: "setup_required", nextAction: "Create the workspace. Account help stays available before setup.", blockers: ["workspace"] };
  }
  const setupGaps: string[] = [];
  if (!norm(snapshot.brand)) setupGaps.push("brand");
  if (!snapshot.approvedQuestions || snapshot.approvedQuestions.questions.length === 0) setupGaps.push("approved buyer questions");
  if (setupGaps.length) {
    return { ...base, stage: "questions_required", nextAction: "Review and approve the exact buyer questions (1–5). Removed questions are never refilled.", blockers: setupGaps };
  }
  const runs = scoped(snapshot, snapshot.runs).sort((a, b) => time(a.createdAt) - time(b.createdAt));
  const decisions = scoped(snapshot, snapshot.decisions);
  if (!runs.length) {
    return snapshot.collectionRequested
      ? { ...base, stage: "collecting", nextAction: "Collection was requested; waiting for the durable run to be recorded." }
      : { ...base, stage: "setup_only", nextAction: "Setup is saved with zero provider calls. Start collection only after reviewing surface and budget." };
  }
  const latest = runs[runs.length - 1];
  const reviewed = runs.filter((run) => reviewedTerminal.has(run.status));
  const baseline = reviewed.find((run) => decisions.some((decision) => decision.baselineRunId === run.id)) || null;

  if (!baseline) {
    if (inFlight.has(latest.status)) return { ...base, stage: "collecting", nextAction: "Collection is running. Partial answers are not zero visibility." };
    if (interrupted.has(latest.status) && !reviewed.length) {
      return { ...base, stage: "collection_interrupted", baselineRunId: latest.id, nextAction: "Inspect the saved Record first; a new provider call is a separate explicit choice.", blockers: [`run ${latest.id} ${latest.status}`] };
    }
    const awaitingReview = runs.find((run) => run.status === "review");
    if (awaitingReview && !reviewed.length) {
      return { ...base, stage: "review_required", baselineRunId: awaitingReview.id, nextAction: "Review the evidence in the Recommendation Record." };
    }
    const candidate = reviewed[reviewed.length - 1];
    if (candidate) {
      return { ...base, stage: "decision_required", baselineRunId: candidate.id, nextAction: "Save a human decision: Change Specification, explicit no-action, or reviewer disagreement." };
    }
    return { ...base, stage: "review_required", baselineRunId: latest.id, nextAction: "Review the evidence in the Recommendation Record." };
  }

  const decision = decisions
    .filter((row) => row.baselineRunId === baseline.id)
    .sort((a, b) => time(b.decidedAt) - time(a.decidedAt))[0];
  const gaps = decisionActionGaps(decision);
  if (gaps.length) {
    return { ...base, stage: "action_required", baselineRunId: baseline.id, decisionId: decision.id, nextAction: "Complete the decision's owner, action and date (or rationale for no-action).", blockers: gaps };
  }
  const later = reviewed.filter((run) => time(run.createdAt) > time(baseline.createdAt));
  if (!later.length) {
    const pending = runs.find((run) => time(run.createdAt) > time(baseline.createdAt));
    return {
      ...base,
      stage: "awaiting_later_cycle",
      baselineRunId: baseline.id,
      decisionId: decision.id,
      nextAction: pending
        ? `A later collection exists (${pending.status}); it becomes eligible only after human review.`
        : "Schedule the later cycle with the same approved questions, model and settings (manual scheduling is an allowed early bridge).",
    };
  }
  const assessments = later.map((run) => assessLaterCycle(baseline, run));
  const comparable = [...assessments].reverse().find((row) => row.status === "comparable");
  if (comparable && comparable.status === "comparable") {
    return {
      ...base,
      stage: "comparable_later_cycle",
      baselineRunId: baseline.id,
      decisionId: decision.id,
      laterCycle: comparable,
      nextAction: "Report observed movement against the exact reviewed baseline. Causation is not proven.",
      closesCustomerProof: comparable.evidence === "customer_cycle",
    };
  }
  const last = assessments[assessments.length - 1];
  return {
    ...base,
    stage: "later_cycle_not_comparable",
    baselineRunId: baseline.id,
    decisionId: decision.id,
    laterCycle: last,
    blockers: last.status === "not_comparable" ? last.reasons : [],
    nextAction: "Show the not-comparable reasons; run a later cycle on the exact same contract before reporting movement.",
  };
}
