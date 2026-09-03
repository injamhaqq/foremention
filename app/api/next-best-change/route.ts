import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext, type WorkspaceRole } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";
import { evaluateNextBestCompanyChanges, type NextBestCandidate } from "@/lib/next-best-company-change";
import { assessChangeVerification, type FollowUpOutcome } from "@/lib/change-verification";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const writable = (role: WorkspaceRole | null) => role === "owner" || role === "admin" || role === "analyst";
const reviewer = (role: WorkspaceRole | null) => role === "owner" || role === "admin";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

async function current() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  return { viewer, context, role };
}

type ChangeRow = {
  id: string;
  title: string;
  status: NextBestCandidate["status"];
  decision_state: NextBestCandidate["decisionState"];
  control_class: NextBestCandidate["controlClass"];
  eligibility_state: NextBestCandidate["eligibilityState"];
  confidence_state: NextBestCandidate["confidenceState"];
  effort: NextBestCandidate["effort"];
  priority_rank: number | null;
  dependencies_json: unknown;
  created_at: string;
};

type EligibilityRow = {
  change_specification_id: string;
  state: NextBestCandidate["eligibilityState"];
  evaluated_at: string;
};

type ChangeEvidenceRow = { change_specification_id: string };
type CrossEvidenceRow = { id: string; direction: "supports" | "contradicts" | "context" | "unknown" };
type CrossLinkRow = { change_specification_id: string; cross_business_evidence_id: string };

type BatchRow = { id: string; candidate_count: number; engine_version: string; evaluated_at: string };
type EvaluationRow = {
  id: string;
  change_specification_id: string;
  priority_band: string;
  ordinal_rank: number;
  reason_codes_json: string[];
  factor_snapshot_json: Record<string, unknown>;
  evaluated_at: string;
};

type CycleRow = {
  id: string;
  change_specification_id: string;
  lifecycle_state: string;
  objective: string;
  started_at: string | null;
  measurement_due_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

type ProgressRow = {
  cycle_id: string;
  lifecycle_state: string;
  change_title: string;
  change_status: string;
  has_execution_asset: boolean;
  has_applied_reference: boolean;
  has_follow_up: boolean;
  has_verification_assessment: boolean;
};

type AssessmentRow = {
  id: string;
  change_specification_id: string;
  resolution_asset_id: string;
  follow_up_id: string;
  verification_state: string;
  comparison_eligible: boolean;
  reason_codes_json: string[];
  metric_snapshot_json: Record<string, unknown>;
  limitations: string[];
  causal_attribution: "not_claimed";
  assessed_at: string;
};

type LearningRow = {
  learning_key: string;
  control_class: string | null;
  assessment_count: number;
  comparable_assessment_count: number;
  improved_count: number;
  unchanged_count: number;
  worsened_count: number;
  insufficient_evidence_count: number;
  verified_cross_business_evidence_count: number;
  latest_assessed_at: string;
};

type FollowUpRow = {
  id: string;
  organization_id: string;
  project_id: string;
  resolution_asset_id: string;
  baseline_run_id: string;
  rerun_id: string | null;
  status: "complete" | "incomparable";
  outcome: FollowUpOutcome;
  limitation: string;
};

const countByChange = (rows: ChangeEvidenceRow[]) => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.change_specification_id, (counts.get(row.change_specification_id) || 0) + 1);
  return counts;
};

const dependencies = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];

export async function GET(request: Request) {
  const active = await current();
  if (!active) return responseError("Authentication required.", 401);
  const { viewer, context } = active;
  if (viewer.mode === "demo") {
    return NextResponse.json({ mode: "demo", pendingMigration: false, latestBatch: null, evaluations: [], cycle: null, progress: null, latestVerification: null, learning: [] }, { headers: { "cache-control": "no-store" } });
  }
  if (!context || !viewer.accessToken) return responseError("Workspace not found.", 404);

  const changeSpecificationId = new URL(request.url).searchParams.get("changeSpecificationId");
  if (changeSpecificationId && !validUuid(changeSpecificationId)) return responseError("Choose a valid Change Specification.", 400);

  try {
    const batches = await supabaseRest<BatchRow[]>(
      `next_best_change_batches?select=id,candidate_count,engine_version,evaluated_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&order=evaluated_at.desc&limit=1`,
      { token: viewer.accessToken },
    );
    const latestBatch = batches[0] || null;
    const evaluations = latestBatch ? await supabaseRest<EvaluationRow[]>(
      `next_best_change_evaluations?select=id,change_specification_id,priority_band,ordinal_rank,reason_codes_json,factor_snapshot_json,evaluated_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&batch_id=eq.${encodeURIComponent(latestBatch.id)}&order=ordinal_rank.asc&limit=100`,
      { token: viewer.accessToken },
    ) : [];

    let cycle: CycleRow | null = null;
    let progress: ProgressRow | null = null;
    let latestVerification: AssessmentRow | null = null;
    let learning: LearningRow[] = [];
    if (changeSpecificationId) {
      const [cycles, progressRows, assessments, learningRows] = await Promise.all([
        supabaseRest<CycleRow[]>(
          `design_partner_execution_cycles?select=id,change_specification_id,lifecycle_state,objective,started_at,measurement_due_at,completed_at,blocked_reason,created_at,updated_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&limit=1`,
          { token: viewer.accessToken },
        ),
        supabaseRest<ProgressRow[]>(
          `design_partner_execution_progress?select=cycle_id,lifecycle_state,change_title,change_status,has_execution_asset,has_applied_reference,has_follow_up,has_verification_assessment&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&limit=1`,
          { token: viewer.accessToken },
        ),
        supabaseRest<AssessmentRow[]>(
          `change_verification_assessments?select=id,change_specification_id,resolution_asset_id,follow_up_id,verification_state,comparison_eligible,reason_codes_json,metric_snapshot_json,limitations,causal_attribution,assessed_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&order=assessed_at.desc&limit=1`,
          { token: viewer.accessToken },
        ),
        supabaseRest<LearningRow[]>(
          `change_learning_summaries?select=learning_key,control_class,assessment_count,comparable_assessment_count,improved_count,unchanged_count,worsened_count,insufficient_evidence_count,verified_cross_business_evidence_count,latest_assessed_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&order=latest_assessed_at.desc&limit=50`,
          { token: viewer.accessToken },
        ),
      ]);
      cycle = cycles[0] || null;
      progress = progressRows[0] || null;
      latestVerification = assessments[0] || null;
      learning = learningRows;
    }

    return NextResponse.json({ mode: "live", pendingMigration: false, latestBatch, evaluations, cycle, progress, latestVerification, learning }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ mode: "live", pendingMigration: true, latestBatch: null, evaluations: [], cycle: null, progress: null, latestVerification: null, learning: [] }, { headers: { "cache-control": "no-store" } });
    console.error("Next Best Change read failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Next Best Change context is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const active = await current();
  if (!active) return responseError("Authentication required.", 401);
  const { viewer, context, role } = active;
  if (viewer.mode === "demo") return responseError("Demo workspaces cannot modify Next Best Change context.", 403);
  if (!context || !viewer.accessToken || !role) return responseError("Workspace not found.", 404);

  const body = asObject(await request.json().catch(() => ({})));
  const action = text(body.action, 80);
  const token = viewer.accessToken;

  try {
    if (action === "evaluate_next_best_changes") {
      if (!writable(role)) return responseError("This workspace role cannot evaluate Next Best Company Changes.", 403);
      const changes = await supabaseRest<ChangeRow[]>(
        `change_specifications?select=id,title,status,decision_state,control_class,eligibility_state,confidence_state,effort,priority_rank,dependencies_json,created_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&status=in.(draft,in_review,approved,in_execution)&order=created_at.asc&limit=200`,
        { token },
      );
      const ids = changes.map((item) => item.id);
      const filter = ids.join(",");
      const [eligibilityRows, evidenceRows, verifiedCrossBusiness, crossLinks] = ids.length ? await Promise.all([
        // Latest eligibility snapshots are authoritative context; they never authorize the company decision.
        supabaseRest<EligibilityRow[]>(`eligibility_evaluations?select=change_specification_id,state,evaluated_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=in.(${filter})&order=evaluated_at.desc&limit=1000`, { token }),
        supabaseRest<ChangeEvidenceRow[]>(`change_specification_evidence?select=change_specification_id&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=in.(${filter})&limit=2000`, { token }),
        // Verified cross-business evidence is context only; it never becomes an automatic approval.
        supabaseRest<CrossEvidenceRow[]>(`cross_business_evidence?select=id,direction&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&verification_state=eq.verified&limit=2000`, { token }),
        supabaseRest<CrossLinkRow[]>(`change_specification_cross_business_evidence?select=change_specification_id,cross_business_evidence_id&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=in.(${filter})&limit=4000`, { token }),
      ]) : [[], [], [], []];

      const latestEligibility = new Map<string, NextBestCandidate["eligibilityState"]>();
      for (const row of eligibilityRows) if (!latestEligibility.has(row.change_specification_id)) latestEligibility.set(row.change_specification_id, row.state);
      const evidenceCounts = countByChange(evidenceRows);
      const verifiedCrossById = new Map(verifiedCrossBusiness.map((row) => [row.id, row]));
      const crossByChange = new Map<string, CrossEvidenceRow[]>();
      for (const link of crossLinks) {
        const evidence = verifiedCrossById.get(link.cross_business_evidence_id);
        if (!evidence) continue;
        const currentRows = crossByChange.get(link.change_specification_id) || [];
        currentRows.push(evidence);
        crossByChange.set(link.change_specification_id, currentRows);
      }
      const statusById = new Map(changes.map((item) => [item.id, item.status]));

      const candidates: NextBestCandidate[] = changes.map((change) => {
        const linkedBusiness = crossByChange.get(change.id) || [];
        const unresolvedDependencies = dependencies(change.dependencies_json).filter((id) => statusById.get(id) !== "completed").length;
        return {
          changeSpecificationId: change.id,
          title: change.title,
          status: change.status,
          decisionState: change.decision_state,
          controlClass: change.control_class,
          eligibilityState: latestEligibility.get(change.id) || change.eligibility_state,
          confidenceState: change.confidence_state,
          effort: change.effort,
          humanPriorityRank: change.priority_rank,
          verifiedEvidenceCount: evidenceCounts.get(change.id) || 0,
          verifiedCrossBusinessEvidenceCount: linkedBusiness.length,
          crossBusinessDirections: linkedBusiness.map((item) => item.direction),
          unresolvedDependencies,
          createdAt: change.created_at,
        };
      });
      const evaluations = evaluateNextBestCompanyChanges(candidates);
      const batchId = await supabaseRest<string>("rpc/record_next_best_change_batch", {
        method: "POST",
        token,
        body: {
          p_project_id: context.projectId,
          p_evaluations: evaluations.map((item) => ({
            changeSpecificationId: item.changeSpecificationId,
            priorityBand: item.priorityBand,
            ordinalRank: item.ordinalRank,
            reasonCodes: item.reasonCodes,
            factorSnapshot: item.factorSnapshot,
          })),
        },
      });
      return NextResponse.json({ batchId, evaluations }, { status: 201 });
    }

    if (action === "start_design_partner_cycle") {
      if (!reviewer(role)) return responseError("Owner or admin review is required to start a verified external execution cycle.", 403);
      if (!validUuid(body.changeSpecificationId)) return responseError("Choose a valid Change Specification.", 400);
      const objective = text(body.objective, 1000);
      if (objective.length < 3) return responseError("Record the design-partner execution objective.", 400);

      const [classification, accountLinks, changes] = await Promise.all([
        supabaseRest<Array<{ classification: string; included_in_company_kpis: boolean }>>(
          `company_organization_classifications?select=classification,included_in_company_kpis&organization_id=eq.${encodeURIComponent(context.organizationId)}&classification=in.(design_partner,customer)&included_in_company_kpis=eq.true&limit=1`,
          { serviceRole: true },
        ),
        supabaseRest<Array<{ id: string }>>(`commercial_accounts?select=id&customer_organization_id=eq.${encodeURIComponent(context.organizationId)}&limit=1`, { serviceRole: true }),
        supabaseRest<Array<{ id: string; status: string }>>(`change_specifications?select=id,status&id=eq.${encodeURIComponent(body.changeSpecificationId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&limit=1`, { token }),
      ]);
      if (!classification[0] || !accountLinks[0]) return responseError("This workspace is not verified as an external design partner/customer with first-party commercial linkage.", 409);
      if (!changes[0] || !["approved", "in_execution", "completed"].includes(changes[0].status)) return responseError("A reviewed Change Specification is required before starting the external execution cycle.", 409);

      const rows = await supabaseRest<Array<{ id: string; lifecycle_state: string }>>("design_partner_execution_cycles?select=id,lifecycle_state", {
        method: "POST",
        token,
        prefer: "return=representation",
        body: { organization_id: context.organizationId, project_id: context.projectId, change_specification_id: body.changeSpecificationId, lifecycle_state: "planned", objective, created_by: viewer.id },
      });
      return NextResponse.json({ id: rows[0]?.id, lifecycleState: rows[0]?.lifecycle_state }, { status: 201 });
    }

    if (action === "refresh_design_partner_cycle") {
      if (!writable(role) || !validUuid(body.cycleId)) return responseError("Choose a valid design-partner execution cycle.", 400);
      const lifecycleState = await supabaseRest<string>("rpc/refresh_design_partner_execution_cycle", { method: "POST", token, body: { p_cycle_id: body.cycleId } });
      return NextResponse.json({ id: body.cycleId, lifecycleState });
    }

    if (action === "assess_change_verification") {
      if (!writable(role) || !validUuid(body.changeSpecificationId) || !validUuid(body.followUpId)) return responseError("Choose a valid Change Specification and follow-up measurement.", 400);
      const followUps = await supabaseRest<FollowUpRow[]>(
        `resolution_follow_ups?select=id,organization_id,project_id,resolution_asset_id,baseline_run_id,rerun_id,status,outcome,limitation&id=eq.${encodeURIComponent(body.followUpId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&status=in.(complete,incomparable)&limit=1`,
        { token },
      );
      const followUp = followUps[0];
      if (!followUp) return responseError("A terminal follow-up measurement is required.", 409);
      const links = await supabaseRest<Array<{ id: string }>>(
        `change_execution_assets?select=id&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(body.changeSpecificationId)}&resolution_asset_id=eq.${encodeURIComponent(followUp.resolution_asset_id)}&limit=1`,
        { token },
      );
      if (!links[0]) return responseError("The follow-up does not belong to this Change Specification execution path.", 409);

      const result = assessChangeVerification({ followUpStatus: followUp.status, outcome: followUp.outcome || {}, limitation: followUp.limitation });
      const rows = await supabaseRest<Array<{ id: string }>>("change_verification_assessments?select=id", {
        method: "POST",
        token,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          change_specification_id: body.changeSpecificationId,
          resolution_asset_id: followUp.resolution_asset_id,
          follow_up_id: followUp.id,
          baseline_run_id: followUp.baseline_run_id,
          follow_up_run_id: followUp.rerun_id,
          verification_state: result.verificationState,
          comparison_eligible: result.comparisonEligible,
          reason_codes_json: result.reasonCodes,
          metric_snapshot_json: result.metricSnapshot,
          limitations: result.limitations,
          causal_attribution: result.causalAttribution,
          assessed_by: viewer.id,
        },
      });
      return NextResponse.json({ id: rows[0]?.id, ...result }, { status: 201 });
    }

    return responseError("Choose a supported Next Best Change action.", 400);
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Next Best Change migration is not installed yet.", 503);
    console.error("Next Best Change mutation failed.", { action, error: error instanceof Error ? error.message : String(error) });
    return responseError("The Next Best Change operation could not be completed.", 409);
  }
}
