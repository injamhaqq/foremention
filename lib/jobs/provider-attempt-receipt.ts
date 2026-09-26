// A durable collection step must carry the identity of the successful
// provider attempt into a SEPARATE persistence step. Inngest may replay the
// persistence step under a different function-level attempt index.
export type ProviderAttemptReceipt<T> = {
  _foremention_collected_attempt_receipt: 1;
  successfulAttemptNumber: number;
  answer: T;
};

export function attachProviderAttempt<T>(answer: T, attemptNumber: number): ProviderAttemptReceipt<T> {
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("A successful provider receipt needs a positive attempt number.");
  }
  return {
    _foremention_collected_attempt_receipt: 1,
    successfulAttemptNumber: attemptNumber,
    answer,
  };
}

export function resolveProviderAttempt<T>(
  payload: ProviderAttemptReceipt<T> | T,
  legacyAttemptNumber: number,
): { answer: T; attemptNumber: number; legacy: boolean } {
  if (typeof payload === "object" && payload !== null &&
      "_foremention_collected_attempt_receipt" in payload) {
    const receipt = payload as ProviderAttemptReceipt<T>;
    if (receipt._foremention_collected_attempt_receipt !== 1 ||
        !Number.isSafeInteger(receipt.successfulAttemptNumber) ||
        receipt.successfulAttemptNumber < 1 ||
        receipt.answer === undefined) {
      throw new Error("The durable collection attempt receipt is malformed.");
    }
    return { answer: receipt.answer, attemptNumber: receipt.successfulAttemptNumber, legacy: false };
  }
  // Compatibility only for collection-step results persisted BEFORE this change.
  // The old receipt had no stable attempt identity; never label its inferred
  // attempt number as proven. Do not run the provider again to upgrade it.
  if (!Number.isSafeInteger(legacyAttemptNumber) || legacyAttemptNumber < 1) {
    throw new Error("Legacy provider attempt fallback must be positive.");
  }
  return { answer: payload as T, attemptNumber: legacyAttemptNumber, legacy: true };
}
