export const PRODUCT_STATES = [
  "NOT_CONFIGURED",
  "READY_TO_COLLECT",
  "COLLECTING",
  "PARTIALLY_COMPLETE",
  "COMPLETE",
  "NEEDS_REVIEW",
  "FILTERED_EMPTY",
  "PAUSED",
  "FAILED_RECOVERABLE",
  "FAILED_BLOCKING",
  "PERMISSION_DENIED",
  "NOT_FOUND",
] as const;

export type ProductState = typeof PRODUCT_STATES[number];

export type RunStateInput = {
  status?: string | null;
  answerCount?: number;
  citationCount?: number;
};

export function stateForRun(input: RunStateInput | null | undefined): ProductState {
  if (!input?.status) return "READY_TO_COLLECT";
  if (input.status === "queued" || input.status === "running") return "COLLECTING";
  if (input.status === "review") return "NEEDS_REVIEW";
  if (input.status === "partial") return "PARTIALLY_COMPLETE";
  if (input.status === "complete") return "COMPLETE";
  if (input.status === "failed") return "FAILED_RECOVERABLE";
  if (input.status === "cancelled") return "READY_TO_COLLECT";
  return "FAILED_RECOVERABLE";
}

export function stateForSources(input: RunStateInput | null | undefined, sourceCount: number, needsReview: number): ProductState {
  if (sourceCount > 0 && needsReview > 0) return "NEEDS_REVIEW";
  if (sourceCount > 0) return "COMPLETE";
  return stateForRun(input);
}

const STATE_LABELS: Record<ProductState, string> = {
  NOT_CONFIGURED: "Setup needed",
  READY_TO_COLLECT: "Ready to collect",
  COLLECTING: "Collecting",
  PARTIALLY_COMPLETE: "Partly complete",
  COMPLETE: "Complete",
  NEEDS_REVIEW: "Needs review",
  FILTERED_EMPTY: "No matches for these filters",
  PAUSED: "Paused",
  FAILED_RECOVERABLE: "Needs another try",
  FAILED_BLOCKING: "Blocked",
  PERMISSION_DENIED: "No access",
  NOT_FOUND: "Not found",
};

export function productStateLabel(state: ProductState) {
  return STATE_LABELS[state];
}
