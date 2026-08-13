export type ComparableQuestionSlot = {
  runId: string;
  promptKey: string;
  promptText: string | null;
  provider: string;
  model: string | null;
};

export type ExactComparability = {
  comparable: boolean;
  reason: string | null;
};

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

function slotIdentity(slot: ComparableQuestionSlot) {
  return [
    slot.promptKey,
    normalize(slot.promptText || ""),
    slot.provider,
    slot.model || "model-not-recorded",
  ].join("\u0000");
}

/**
 * A run pair is comparable only when the exact persisted buyer-question text,
 * provider, and exact model matrix is identical. Methodology and terminal
 * review status are already enforced by the caller before this final gate.
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
  if (scoped.some((slot) => !slot.model)) {
    return { comparable: false, reason: "Exact model provenance is missing from at least one verified answer." };
  }

  const latest = scoped.filter((slot) => slot.runId === latestRunId).map(slotIdentity).sort();
  const previous = scoped.filter((slot) => slot.runId === previousRunId).map(slotIdentity).sort();
  if (!latest.length || latest.length !== previous.length || latest.some((key, index) => key !== previous[index])) {
    return { comparable: false, reason: "The exact buyer-question/provider/model matrix changed between these reviewed collections." };
  }
  return { comparable: true, reason: null };
}
