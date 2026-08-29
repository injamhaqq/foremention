export type GapEvidence = {
  recordId: string;
  question: string;
  customerPresent: boolean;
  competitorNames: string[];
  reviewedEvidenceCount: number;
  returnedCitationCount: number;
  observedAt: string;
};

export type RecommendationGapDiagnosis = {
  observation: string;
  inference: string | null;
  evidence: Array<{ recordId: string; observedAt: string; reviewedEvidenceCount: number; returnedCitationCount: number }>;
  limitation: string;
};

export function diagnoseRecommendationGap(records: GapEvidence[], competitor: string): RecommendationGapDiagnosis | null {
  const normalized = competitor.trim().toLocaleLowerCase();
  if (!normalized) return null;
  const evidenceRecords = records.filter((record) => record.competitorNames.some((name) => name.trim().toLocaleLowerCase() === normalized));
  if (!evidenceRecords.length) return null;
  const customerMissing = evidenceRecords.filter((record) => !record.customerPresent);
  const reviewed = evidenceRecords.reduce((sum, record) => sum + Math.max(0, record.reviewedEvidenceCount), 0);
  const observation = `${competitor} appeared in ${evidenceRecords.length} persisted Recommendation Record${evidenceRecords.length === 1 ? "" : "s"}; the customer was absent from ${customerMissing.length} of those exact observations.`;
  const inference = reviewed > 0
    ? `Reviewed evidence is available for these records. A human can inspect recurring source or claim differences, but Foremention does not treat correlation as the cause of a recommendation.`
    : null;
  return {
    observation,
    inference,
    evidence: evidenceRecords.map((record) => ({ recordId: record.recordId, observedAt: record.observedAt, reviewedEvidenceCount: record.reviewedEvidenceCount, returnedCitationCount: record.returnedCitationCount })),
    limitation: "This diagnosis separates observation from inference. Returned citations, reviewed evidence, chronology, and competitor appearance do not by themselves prove why an AI system recommended a brand.",
  };
}
