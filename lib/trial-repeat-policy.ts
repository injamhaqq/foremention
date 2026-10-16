/**
 * Fail-closed admission for a repeat measurement. Pure policy: it does not
 * create or upgrade entitlements and cannot reserve provider capacity.
 * Trial repeats are early follow-ups, NOT a full seven-day weekly interval.
 */
const HOUR_MS = 3_600_000;
export const MIN_TRIAL_REPEAT_GAP_MS = 24 * HOUR_MS;
export const TARGET_TRIAL_REPEAT_GAP_MS = 72 * HOUR_MS;
export const TRIAL_COMPLETION_BUFFER_MS = 2 * HOUR_MS;

export type RepeatPolicyReason =
  | "BASELINE_INCOMPLETE"
  | "BASELINE_UNKNOWN_CONTRACT"
  | "TRIAL_NOT_ACTIVE"
  | "TRIAL_WINDOW_TOO_SHORT"
  | "TRIAL_WINDOW_EXPIRED"
  | "ENTITLEMENT_UNKNOWN"
  | "ENTITLEMENT_CHANGED"
  | "CAPACITY_UNAVAILABLE"
  | "CONTRACT_NOT_PINNED"
  | "USER_PAUSED";

export type RepeatPolicyResult =
  | { eligible: true; dueAt: string }
  | { eligible: false; reason: RepeatPolicyReason; action: string };

const rejected = (reason: RepeatPolicyReason, action: string): RepeatPolicyResult =>
  ({ eligible: false, reason, action });

function timestamp(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Schedule a first *short-interval* trial follow-up that has a chance to
 * finish before expiry. The server must still verify eligibility and reserve
 * quota atomically at dispatch. A planned timestamp is not a guarantee.
 */
export function planTrialFollowUp(input: {
  baselineStatus: string;
  baselineCompletedAt: string | Date | null;
  trialExpiresAt: string | Date | null;
  now: string | Date;
  billingSource: string | null;
  entitlementStatus: string | null;
}): RepeatPolicyResult {
  if (input.baselineStatus !== "complete" || timestamp(input.baselineCompletedAt) === null) {
    return rejected("BASELINE_INCOMPLETE", "Review a complete baseline before arranging a follow-up.");
  }
  if (input.billingSource !== "trial" || input.entitlementStatus !== "active") {
    return rejected("TRIAL_NOT_ACTIVE", "Review the current plan and choose a manually authorized collection.");
  }
  const now = timestamp(input.now);
  const baseline = timestamp(input.baselineCompletedAt);
  const expiry = timestamp(input.trialExpiresAt);
  if (now === null || baseline === null || expiry === null) {
    return rejected("ENTITLEMENT_UNKNOWN", "Verify the server trial expiry before offering a repeat.");
  }
  if (now >= expiry - TRIAL_COMPLETION_BUFFER_MS) {
    return rejected("TRIAL_WINDOW_EXPIRED", "The remaining trial window cannot safely admit a repeat; review the plan or choose a manual collection.");
  }
  // An hourly dispatcher cannot retroactively execute a missed observation.
  // Never truncate the minimum elapsed time between a baseline and follow-up.
  const earliest = Math.max(baseline + MIN_TRIAL_REPEAT_GAP_MS, now + HOUR_MS);
  const latest = expiry - TRIAL_COMPLETION_BUFFER_MS;
  if (earliest > latest) {
    return rejected("TRIAL_WINDOW_TOO_SHORT", "There is insufficient trial time for a later observation; choose a manual follow-up or a plan deliberately.");
  }
  const due = Math.min(Math.max(baseline + TARGET_TRIAL_REPEAT_GAP_MS, earliest), latest);
  return { eligible: true, dueAt: new Date(due).toISOString() };
}

/**
 * Held schedules must never borrow downgraded Free capacity for a promised
 * Core trial repeat. Existing schedules without explicit origin/pin metadata
 * are legacy unknowns requiring review, not guessed backfills.
 */
export function admitRepeatDispatch(input: {
  enabled: boolean;
  origin: "trial" | "paid" | "manual" | null;
  pinned: boolean;
  now: string | Date;
  trialExpiresAt?: string | Date | null;
  currentBillingSource: string | null;
  currentEntitlementStatus: string | null;
  remainingObservationUnits: number | null;
  requestedObservationUnits: number;
}): Exclude<RepeatPolicyResult, { eligible: true; dueAt: string }> | { eligible: true } {
  if (!input.enabled) return rejected("USER_PAUSED", "Leave the user's disabled schedule disabled.");
  if (!input.pinned || !input.origin) return rejected("CONTRACT_NOT_PINNED", "Confirm the baseline model, versions, and schedule origin before resuming.");
  if (input.currentEntitlementStatus !== "active") return rejected("ENTITLEMENT_CHANGED", "Review current entitlement before a new observation.");
  if (input.origin === "trial") {
    const expiry = timestamp(input.trialExpiresAt);
    const now = timestamp(input.now);
    if (expiry === null || now === null) return rejected("ENTITLEMENT_UNKNOWN", "Verify the original trial end timestamp.");
    if (input.currentBillingSource !== "trial" || now >= expiry - TRIAL_COMPLETION_BUFFER_MS) {
      return rejected("TRIAL_WINDOW_EXPIRED", "No trial-capacity repeat may dispatch after the authorized window.");
    }
  }
  if (input.origin === "paid" && !["paddle", "stripe", "creem"].includes(input.currentBillingSource || "")) {
    return rejected("ENTITLEMENT_CHANGED", "Paid schedule requires current verified paid entitlement.");
  }
  if (!Number.isSafeInteger(input.requestedObservationUnits) || input.requestedObservationUnits <= 0
    || input.remainingObservationUnits === null || !Number.isSafeInteger(input.remainingObservationUnits)
    || input.remainingObservationUnits < input.requestedObservationUnits) {
    return rejected("CAPACITY_UNAVAILABLE", "The current observation quota is insufficient or unknown; do not queue the run.");
  }
  return { eligible: true };
}

export type BaselineAnswerPin = {
  promptKey: string;
  promptText: string;
  provider: string;
  model: string;
  measurementContext: Record<string, unknown> | null;
};

export type VerifiedBaselinePin = {
  baselineRunId: string;
  methodologyVersion: string;
  provider: string;
  model: string;
  questionPins: Array<{ promptKey: string; promptText: string; context: Record<string, string> }>;
};

const requiredContextKeys = [
  "locale", "market", "buyerStage", "promptVersion", "parserVersion",
  "retrievalVersion", "policyVersion", "schemaVersion", "evaluationVersion",
] as const;

/**
 * Capture ONLY recorded successful baseline facts; missing versions remain
 * unknown, never guessed. Sampling/temperature/seed or retrieval settings
 * not captured by these fields need an explicit schema upgrade before a
 * comparison can claim they are controlled.
 */
export function pinCompleteBaseline(input: {
  runId: string;
  status: string;
  completedAt: string | null;
  methodologyVersion: string | null;
  expectedAnswers: number;
  answers: BaselineAnswerPin[];
}): { eligible: true; pin: VerifiedBaselinePin } | { eligible: false; reason: RepeatPolicyReason } {
  if (input.status !== "complete" || timestamp(input.completedAt) === null
    || !Number.isSafeInteger(input.expectedAnswers) || input.expectedAnswers < 1
    || input.answers.length !== input.expectedAnswers) {
    return { eligible: false, reason: "BASELINE_INCOMPLETE" };
  }
  if (!input.runId || !input.methodologyVersion?.trim()) {
    return { eligible: false, reason: "BASELINE_UNKNOWN_CONTRACT" };
  }
  const all = input.answers;
  const model = all[0]?.model?.trim();
  const provider = all[0]?.provider?.trim();
  const seen = new Set<string>();
  const questionPins: VerifiedBaselinePin["questionPins"] = [];
  if (!model || !provider) return { eligible: false, reason: "BASELINE_UNKNOWN_CONTRACT" };
  for (const answer of all) {
    const key = answer.promptKey?.trim();
    const text = answer.promptText?.replace(/\s+/g, " ").trim();
    if (!key || !text || seen.has(key) || answer.model?.trim() !== model || answer.provider?.trim() !== provider) {
      return { eligible: false, reason: "BASELINE_UNKNOWN_CONTRACT" };
    }
    const context: Record<string, string> = {};
    for (const field of requiredContextKeys) {
      const value = answer.measurementContext?.[field];
      if (typeof value !== "string" || !value.trim()) {
        return { eligible: false, reason: "BASELINE_UNKNOWN_CONTRACT" };
      }
      context[field] = value.trim();
    }
    seen.add(key);
    questionPins.push({ promptKey: key, promptText: text, context });
  }
  questionPins.sort((a, b) => a.promptKey.localeCompare(b.promptKey));
  return { eligible: true, pin: { baselineRunId: input.runId, methodologyVersion: input.methodologyVersion.trim(), provider, model, questionPins } };
}
