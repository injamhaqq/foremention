/** Presentation-only handoff. The existing API revalidates tenant ownership and review state. */
export type DecisionEvidence = { id: string; kind: string; runId?: string | null };
export const decisionRecordId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildDecisionDraftRequest(opportunityId: string, evidence: DecisionEvidence[], selectedIds: string[], baselineRunId: string) {
  if (!decisionRecordId.test(opportunityId)) throw new Error("This problem has no valid opportunity record. Reload before creating a decision.");
  const selected = new Set(selectedIds);
  const items = evidence.filter((item) => selected.has(item.id));
  if (!items.length || items.length !== selected.size) throw new Error("Select recorded evidence from this problem.");
  if (items.some((item) => !decisionRecordId.test(item.id) || !["source_observation", "evidence_item"].includes(item.kind))) throw new Error("Only persisted source observations and evidence items can support this draft.");
  if (baselineRunId && !decisionRecordId.test(baselineRunId)) throw new Error("Choose a valid baseline Record.");
  const observations = items.filter((item) => item.kind === "source_observation");
  if (observations.some((item) => !baselineRunId || item.runId !== baselineRunId)) throw new Error("Choose one baseline Record and select its source observations. Evidence from other Records remains available to inspect.");
  const sourceObservationIds = observations.map((item) => item.id);
  const evidenceItemIds = items.filter((item) => item.kind === "evidence_item").map((item) => item.id);
  if (sourceObservationIds.length > 20 || evidenceItemIds.length > 20) throw new Error("Select at most 20 records of each evidence type. No evidence will be silently omitted.");
  return { action: "create_from_opportunity" as const, opportunityId, baselineRunId: baselineRunId || null, sourceObservationIds, evidenceItemIds };
}
