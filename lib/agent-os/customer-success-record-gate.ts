import type { RecordIntegrityResult } from "@/lib/record-integrity";

type ReviewedRecord = Pick<
  RecordIntegrityResult,
  "run" | "answers" | "verifiedAnswers" | "completePersistedAnswerSet" | "completeObservationCoverage"
>;

/**
 * A reviewed-run event alone never proves a completed customer collection.
 *
 * The caller reads the record under organization + project scope and this
 * pure gate enforces finalized review, untruncated manifest/answer coverage,
 * and explicit verification of every persisted answer before any agent action
 * or customer-facing communication draft can be recorded.
 *
 * Partial runs can still be human reviewed, provided all observed answers
 * are verified and failed/excluded manifest slots are accounted for.
 */
export function reviewedRecordReadyForCustomerSuccess(record: ReviewedRecord | null): boolean {
  if (!record || !["complete", "partial"].includes(record.run.status)) return false;
  if (!record.completePersistedAnswerSet || !record.completeObservationCoverage) return false;
  return record.answers.length > 0 && record.verifiedAnswers === record.answers.length;
}
