export type AttentionPriority = "critical" | "high" | "normal" | "low";
export type AttentionKind = "setup" | "run_failed" | "collection_running" | "comparison" | "review" | "action" | "alert" | "schedule";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  priority: AttentionPriority;
  title: string;
  detail: string;
  href: string;
  occurredAt?: string | null;
};

export type ComparableSnapshot = {
  runId: string;
  questionFingerprint: string;
  provider: string;
  model: string | null;
  methodology: string;
  locale: string;
  market: string;
  presencePct: number;
  competitors: string[];
  citations: string[];
  reviewedAt: string | null;
};

export type ComparableChange =
  | { kind: "comparison_withheld"; reason: string; baselineRunId: string; currentRunId: string }
  | { kind: "recommendation_presence_changed"; delta: number; baselineRunId: string; currentRunId: string }
  | { kind: "competitor_appearance_changed"; appeared: string[]; disappeared: string[]; baselineRunId: string; currentRunId: string }
  | { kind: "citation_set_changed"; added: string[]; removed: string[]; baselineRunId: string; currentRunId: string };

function normalized(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean))).sort();
}

function exactComparable(a: ComparableSnapshot, b: ComparableSnapshot) {
  if (!a.reviewedAt || !b.reviewedAt) return { ok: false, reason: "Both collections need terminal human review before Foremention reports movement." } as const;
  const fields: Array<[string, string]> = [
    [a.questionFingerprint, b.questionFingerprint],
    [a.provider, b.provider],
    [a.model || "", b.model || ""],
    [a.methodology, b.methodology],
    [a.locale, b.locale],
    [a.market, b.market],
  ];
  if (fields.some(([left, right]) => left !== right)) {
    return { ok: false, reason: "Comparison withheld: buyer question, provider, exact model, methodology, locale, and market must match." } as const;
  }
  return { ok: true } as const;
}

export function deriveComparableChanges(baseline: ComparableSnapshot, current: ComparableSnapshot): ComparableChange[] {
  const eligibility = exactComparable(baseline, current);
  if (!eligibility.ok) return [{ kind: "comparison_withheld", reason: eligibility.reason, baselineRunId: baseline.runId, currentRunId: current.runId }];

  const changes: ComparableChange[] = [];
  const delta = Number((current.presencePct - baseline.presencePct).toFixed(2));
  if (delta !== 0) changes.push({ kind: "recommendation_presence_changed", delta, baselineRunId: baseline.runId, currentRunId: current.runId });

  const beforeCompetitors = normalized(baseline.competitors);
  const afterCompetitors = normalized(current.competitors);
  const appeared = afterCompetitors.filter((name) => !beforeCompetitors.includes(name));
  const disappeared = beforeCompetitors.filter((name) => !afterCompetitors.includes(name));
  if (appeared.length || disappeared.length) changes.push({ kind: "competitor_appearance_changed", appeared, disappeared, baselineRunId: baseline.runId, currentRunId: current.runId });

  const beforeCitations = normalized(baseline.citations);
  const afterCitations = normalized(current.citations);
  const added = afterCitations.filter((url) => !beforeCitations.includes(url));
  const removed = beforeCitations.filter((url) => !currentSources.includes(url));
  if (added.length || removed.length) changes.push({ kind: "citation_set_changed", added, removed, baselineRunId: baseline.runId, currentRunId: current.runId });
  return changes;
}

export type AttentionInput = {
  onboardingComplete: boolean;
  activeRun?: { id: string; status: "queued" | "running" | "failed"; error?: string | null } | null;
  reviewBacklog?: number;
  dueActions?: Array<{ id: string; title: string; dueAt: string; overdue?: boolean }>;
  alerts?: Array<{ id: string; title: string; body: string; href?: string | null; createdAt?: string | null; unread?: boolean }>;
  comparison?: ComparableChange[];
  scheduleEnabled?: boolean;
};

export function deriveAttentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (!input.onboardingComplete) items.push({ id: "setup", kind: "setup", priority: "high", title: "Finish your trustworthy baseline", detail: "Complete workspace context, approve buyer questions, and collect your first real Recommendation Record.", href: "/app/onboarding" });
  if (input.activeRun?.status === "failed") items.push({ id: `run-${input.activeRun.id}`, kind: "run_failed", priority: "critical", title: "A collection needs attention", detail: input.activeRun.error || "The collection failed without inventing replacement evidence.", href: `/app/runs/${input.activeRun.id}` });
  if (input.activeRun && ["queued", "running"].includes(input.activeRun.status)) items.push({ id: `run-${input.activeRun.id}`, kind: "collection_running", priority: "normal", title: "A collection is in progress", detail: "Foremention is preserving provider/model provenance and returned evidence while this run completes.", href: `/app/runs/${input.activeRun.id}` });
  if ((input.reviewBacklog || 0) > 0) items.push({ id: "review-backlog", kind: "review", priority: "high", title: `${input.reviewBacklog} evidence item${input.reviewBacklog === 1 ? "" : "s"} need review`, detail: "Human review is required before this evidence can support a decision.", href: "/app/source-map" });

  for (const action of input.dueActions || []) items.push({
    id: `action-${action.id}`,
    kind: "action",
    priority: action.overdue ? "critical" : "high",
    title: action.overdue ? `Overdue: ${action.title}` : `Remeasurement due: ${action.title}`,
    detail: "Remeasure against an exact comparable collection; an observed change is not proof that the action caused it.",
    href: "/app/placements",
    occurredAt: action.dueAt,
  });

  for (const change of input.comparison || []) {
    if (change.kind === "comparison_withheld") items.push({ id: `comparison-${change.currentRunId}`, kind: "comparison", priority: "normal", title: "Comparison withheld", detail: change.reason, href: "/app/analytics" });
    if (change.kind === "recommendation_presence_changed") items.push({ id: `presence-${change.currentRunId}`, kind: "comparison", priority: "high", title: `Recommendation presence changed ${change.delta > 0 ? "+" : ""}${change.delta} points`, detail: "This is a reviewed comparable observation. Foremention does not claim what caused the movement.", href: "/app/analytics" });
    if (change.kind === "competitor_appearance_changed") items.push({ id: `competitors-${change.currentRunId}`, kind: "comparison", priority: "high", title: "Competitor recommendation set changed", detail: `${change.appeared.length} appeared · ${change.disappeared.length} disappeared in an exact reviewed comparison.`, href: "/app/analytics" });
    if (change.kind === "citation_set_changed") items.push({ id: `citations-${change.currentRunId}`, kind: "comparison", priority: "normal", title: "Returned citation set changed", detail: `${change.added.length} added · ${change.removed.length} removed. Returned references do not prove causal influence.`, href: "/app/analytics" });
  }

  for (const alert of input.alerts || []) if (alert.unread !== false) items.push({ id: `alert-${alert.id}`, kind: "alert", priority: "normal", title: alert.title, detail: alert.body, href: alert.href || "/app/alerts", occurredAt: alert.createdAt });
  if (input.onboardingComplete && !input.scheduleEnabled) items.push({ id: "schedule", kind: "schedule", priority: "low", title: "Make this baseline repeatable", detail: "Enable a recurring comparable measurement after you are satisfied with the approved question/provider setup.", href: "/app/settings#measurement-schedule" });

  const rank: Record<AttentionPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority] || (b.occurredAt || "").localeCompare(a.occurredAt || ""));
}

export type RetentionMilestoneInput = {
  onboardingComplete: boolean;
  firstCollectionCompleted: boolean;
  firstRecordReviewed: boolean;
  firstActionCreated: boolean;
  firstActionAssigned?: boolean;
  scheduleEnabled: boolean;
  comparableReviewedCycles: number;
  shareCreated: boolean;
  teammateInvited: boolean;
};

export function deriveRetentionMilestones(input: RetentionMilestoneInput) {
  return {
    activation_completed: input.onboardingComplete && input.firstCollectionCompleted,
    first_record_reviewed: input.firstRecordReviewed,
    action_created: input.firstActionCreated,
    action_assigned: Boolean(input.firstActionAssigned),
    measurement_schedule_enabled: input.scheduleEnabled,
    second_comparable_cycle_completed: input.comparableReviewedCycles >= 2,
    record_share_created: input.shareCreated,
    team_invite_sent: input.teammateInvited,
  } as const;
}

export type ActionRemeasurementState = {
  kind: "action_remeasurement_due";
  actionId: string;
  dueAt: string;
  baselineRunId: string | null;
};

export function actionRemeasurementDue(action: { id: string; remeasurementDueAt?: string | null; baselineRunId?: string | null }, now = new Date()): ActionRemeasurementState | null {
  if (!action.remeasurementDueAt) return null;
  const due = new Date(action.remeasurementDueAt);
  if (!Number.isFinite(due.getTime()) || due > now) return null;
  return { kind: "action_remeasurement_due", actionId: action.id, dueAt: due.toISOString(), baselineRunId: action.baselineRunId || null };
}

export type ActivationStageKey = "workspace_configured" | "five_questions" | "first_record" | "first_review" | "first_action" | "action_assigned" | "second_comparable_cycle" | "retained_loop";
export type ActivationStageInput = {
  workspaceConfigured: boolean;
  approvedQuestions: number;
  firstCollectionCompleted: boolean;
  firstRecordReviewed: boolean;
  firstActionCreated: boolean;
  firstActionAssigned: boolean;
  comparableReviewedCycles: number;
};
export type ActivationStage = { key: ActivationStageKey; title: string; detail: string; href: string; complete: boolean };

export function deriveActivationStage(input: ActivationStageInput): ActivationStage {
  if (!input.workspaceConfigured) return { key: "workspace_configured", title: "Configure the workspace", detail: "Set the company, category, and comparison context before measuring anything.", href: "/app/onboarding", complete: false };
  if (input.approvedQuestions < 5) return { key: "five_questions", title: "Approve 5 priority buyer questions", detail: `You have ${Math.max(0, input.approvedQuestions)} of 5 priority questions approved. Keep the first baseline deliberately small.`, href: "/app/prompts", complete: false };
  if (!input.firstCollectionCompleted) return { key: "first_record", title: "Create the first Recommendation Record", detail: "Run the approved baseline so the exact question, provider/model context, answer, and returned evidence are recorded together.", href: "/app/prompts", complete: false };
  if (!input.firstRecordReviewed) return { key: "first_review", title: "Review the first Recommendation Record", detail: "Human review is required before returned evidence can support a safe conclusion or later comparison.", href: "/app/runs", complete: false };
  if (!input.firstActionCreated) return { key: "first_action", title: "Create one evidence-backed action", detail: "Turn one reviewed finding into a concrete next step without claiming causality.", href: "/app/placements", complete: false };
  if (!input.firstActionAssigned) return { key: "action_assigned", title: "Assign an owner to the action", detail: "Give the action one accountable owner before Foremention treats it as operationalized for remeasurement.", href: "/app/placements", complete: false };
  if (input.comparableReviewedCycles < 2) return { key: "second_comparable_cycle", title: "Complete the second comparable cycle", detail: "Repeat the approved measurement only when question, provider, model, methodology, locale, and market remain comparable.", href: "/app/settings#measurement-schedule", complete: false };
  return { key: "retained_loop", title: "The retention loop is established", detail: "You have a reviewed baseline, an owned action, and a second comparable cycle. Attention can now focus on material changes instead of setup.", href: "/app/analytics", complete: true };
}
