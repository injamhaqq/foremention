import type { Viewer } from "@/lib/auth";
import type { WorkspaceContext } from "@/lib/data";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

type ChangeSpecificationPriorityRow = {
  id: string;
  title: string;
  exact_change: string | null;
  control_class: string | null;
  eligibility_state: string;
  decision_state: string;
  confidence_state: string;
  effort: string | null;
  owner_role: string | null;
  priority_rank: number | null;
  acceptance_criteria_json: string[];
  verification_plan_json: Record<string, unknown>;
  created_at: string;
};

type ChangeSpecificationEvidenceRow = {
  change_specification_id: string;
};

type NextBestBatchRow = { id: string };
type NextBestEvaluationRow = {
  change_specification_id: string;
  priority_band: string;
  ordinal_rank: number;
  reason_codes_json: string[];
};

export type ChangeSpecificationPriorityItem = {
  id: string;
  title: string;
  exactChange: string | null;
  controlClass: string | null;
  eligibilityState: string;
  decisionState: string;
  confidenceState: string;
  effort: string | null;
  ownerRole: string | null;
  priorityRank: number | null;
  evidenceCount: number;
  acceptanceCriteriaCount: number;
  hasVerificationPlan: boolean;
  createdAt: string;
  recommendedBand: string | null;
  recommendedOrdinal: number | null;
  recommendedReasons: string[];
};

const inFilter = (ids: string[]) => ids.join(",");

export async function loadPriorityChangeSpecifications(
  viewer: Viewer,
  context: WorkspaceContext | null,
): Promise<ChangeSpecificationPriorityItem[]> {
  if (viewer.mode !== "supabase" || !viewer.accessToken || !context) return [];

  try {
    const rows = await supabaseRest<ChangeSpecificationPriorityRow[]>(
      `change_specifications?select=id,title,exact_change,control_class,eligibility_state,decision_state,confidence_state,effort,owner_role,priority_rank,acceptance_criteria_json,verification_plan_json,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(draft,in_review,approved,in_execution)&order=priority_rank.asc.nullslast,created_at.desc&limit=25`,
      { token: viewer.accessToken },
    );
    const ids = rows.map((row) => row.id);
    const links = ids.length
      ? await supabaseRest<ChangeSpecificationEvidenceRow[]>(
        `change_specification_evidence?select=change_specification_id&change_specification_id=in.(${inFilter(ids)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
        { token: viewer.accessToken },
      )
      : [];

    const counts = new Map<string, number>();
    for (const link of links) counts.set(link.change_specification_id, (counts.get(link.change_specification_id) || 0) + 1);

    const recommendationByChange = new Map<string, NextBestEvaluationRow>();
    try {
      const batches = await supabaseRest<NextBestBatchRow[]>(
        `next_best_change_batches?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=evaluated_at.desc&limit=1`,
        { token: viewer.accessToken },
      );
      if (batches[0] && ids.length) {
        const evaluations = await supabaseRest<NextBestEvaluationRow[]>(
          `next_best_change_evaluations?select=change_specification_id,priority_band,ordinal_rank,reason_codes_json&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&batch_id=eq.${batches[0].id}&change_specification_id=in.(${inFilter(ids)})&order=ordinal_rank.asc&limit=100`,
          { token: viewer.accessToken },
        );
        for (const evaluation of evaluations) recommendationByChange.set(evaluation.change_specification_id, evaluation);
      }
    } catch (error) {
      if (!isMissingRelationError(error)) throw error;
    }

    return rows
      .map((row, originalIndex) => ({ row, originalIndex, recommendation: recommendationByChange.get(row.id) || null }))
      .sort((a, b) => {
        const aOrdinal = a.recommendation?.ordinal_rank ?? Number.MAX_SAFE_INTEGER;
        const bOrdinal = b.recommendation?.ordinal_rank ?? Number.MAX_SAFE_INTEGER;
        if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
        return a.originalIndex - b.originalIndex;
      })
      .slice(0, 5)
      .map(({ row, recommendation }) => ({
        id: row.id,
        title: row.title,
        exactChange: row.exact_change,
        controlClass: row.control_class,
        eligibilityState: row.eligibility_state,
        decisionState: row.decision_state,
        confidenceState: row.confidence_state,
        effort: row.effort,
        ownerRole: row.owner_role,
        priorityRank: row.priority_rank,
        evidenceCount: counts.get(row.id) || 0,
        acceptanceCriteriaCount: Array.isArray(row.acceptance_criteria_json) ? row.acceptance_criteria_json.length : 0,
        hasVerificationPlan: Boolean(row.verification_plan_json && Object.keys(row.verification_plan_json).length > 0),
        createdAt: row.created_at,
        recommendedBand: recommendation?.priority_band || null,
        recommendedOrdinal: recommendation?.ordinal_rank || null,
        recommendedReasons: recommendation?.reason_codes_json || [],
      }));
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}
