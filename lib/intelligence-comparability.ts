export type ComparableMeasurementContext = {
  locale: string | null;
  market: string | null;
  buyerStage: string | null;
  promptVersion: string | null;
  parserVersion: string | null;
  retrievalVersion: string | null;
  policyVersion: string | null;
  schemaVersion: string | null;
  evaluationVersion: string | null;
};

export type ComparableQuestionSlot = {
  runId: string;
  promptKey: string;
  promptText: string | null;
  provider: string;
  model: string | null;
  measurementContext: ComparableMeasurementContext | null;
};

export type ExactComparability = {
  comparable: boolean;
  reason: string | null;
};

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const measurementKeys: Array<keyof ComparableMeasurementContext> = [
  "locale",
  "market",
  "buyerStage",
  "promptVersion",
  "parserVersion",
  "retrievalVersion",
  "policyVersion",
  "schemaVersion",
  "evaluationVersion",
];

function nullableString(value: unknown) {
  return typeof value === "string" && normalize(value) ? normalize(value) : null;
}

export function coerceComparableMeasurementContext(value: unknown): ComparableMeasurementContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    locale: nullableString(record.locale),
    market: nullableString(record.market),
    buyerStage: nullableString(record.buyerStage),
    promptVersion: nullableString(record.promptVersion),
    parserVersion: nullableString(record.parserVersion),
    retrievalVersion: nullableString(record.retrievalVersion),
    policyVersion: nullableString(record.policyVersion),
    schemaVersion: nullableString(record.schemaVersion),
    evaluationVersion: nullableString(record.evaluationVersion),
  };
}

function hasCompleteMeasurementContext(context: ComparableMeasurementContext | null) {
  return Boolean(context && measurementKeys.every((key) => Boolean(context[key] && normalize(context[key] || ""))));
}

function slotIdentity(slot: ComparableQuestionSlot) {
  const context = slot.measurementContext as ComparableMeasurementContext;
  return [
    slot.promptKey,
    normalize(slot.promptText || ""),
    normalize(slot.provider),
    normalize(slot.model || ""),
    ...measurementKeys.map((key) => normalize(context[key] || "")),
  ].join("\u0000");
}

/**
 * A run pair is comparable only when the exact persisted buyer-question text,
 * provider, model, locale, market, buyer stage, and versioned measurement
 * context matrix is identical. Methodology and terminal review status are
 * already enforced by the caller before this final gate.
 */
export function assessExactQuestionComparability(
  latestRunId: string,
  previousRunId: string,
  slots: ComparableQuestionSlot[],
): ExactComparability {
  const scoped = slots.filter((slot) => slot.runId === latestRunId || slot.runId === previousRunId);
  if (scoped.some((slot) => !slot.promptText || !normalize(slot.promptText))) {
    return { comparable: false, reason: "Exact buyer-question text is missing from at least one verified answer." };
  }
  if (scoped.some((slot) => !slot.model || !normalize(slot.model))) {
    return { comparable: false, reason: "Exact model provenance is missing from at least one verified answer." };
  }
  if (scoped.some((slot) => !hasCompleteMeasurementContext(slot.measurementContext))) {
    return { comparable: false, reason: "Verified measurement context is unavailable for one or more answers, including locale, market, buyer stage, or version identity." };
  }

  const latest = scoped.filter((slot) => slot.runId === latestRunId).map(slotIdentity).sort();
  const previous = scoped.filter((slot) => slot.runId === previousRunId).map(slotIdentity).sort();
  if (!latest.length || latest.length !== previous.length || latest.some((key, index) => key !== previous[index])) {
    return { comparable: false, reason: "The exact buyer-question/provider/model/measurement context matrix changed between these reviewed collections." };
  }
  return { comparable: true, reason: null };
}