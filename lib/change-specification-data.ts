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
};

const inFilter = (ids: string[]) => ids.join(",");

export async function loadPriorityChangeSpecifications(
  viewer: Viewer,
  context: WorkspaceContext | null,
): Promise<ChangeSpecificationPriorityItem[]> {
  if (viewer.mode !== "supabase" || !viewer.accessToken || !context) return [];

  try {
    const rows = await supabaseRest<ChangeSpecificationPriorityRow[]>(
      `change_specifications?select=id,title,exact_change,control_class,eligibility_state,decision_state,confidence_state,effort,owner_role,priority_rank,acceptance_criteria_json,verification_plan_json,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(draft,in_review,approved,in_execution,completed)&order=priority_rank.asc.nullslast,created_at.desc&limit=5`,
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

    return rows.map((row) => ({
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
    }));
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}
