import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext, type WorkspaceContext, type WorkspaceRole } from "@/lib/data";
import {
  buildSafeChangeSpecificationDraft,
  CHANGE_SPECIFICATION_STATUSES,
  CONFIDENCE_STATES,
  CONTROL_CLASSES,
  DECISION_STATES,
  EFFORT_STATES,
  ELIGIBILITY_STATES,
  isCanonicalValue,
  TRUTH_STATES,
  type ChangeSpecification,
  type ChangeSpecificationStatus,
  validateChangeSpecificationForReview,
} from "@/lib/change-specification";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

const PENDING_MIGRATION = "Change Specifications are not enabled for this workspace yet. A workspace owner must apply the pending Foremention database migration.";
const pendingMigrationResponse = () => NextResponse.json({ error: PENDING_MIGRATION, status: "pending_migration" }, { status: 503 });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
const cleanMultiline = (value: unknown, limit: number) => typeof value === "string"
  ? value.replace(/\r\n?/g, "\n").replace(/[\t ]+\n/g, "\n").trim().slice(0, limit)
  : "";
const uniqueIds = (value: unknown, limit = 20) => Array.from(new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && uuid.test(id)) : [])).slice(0, limit);
const writable = (role: WorkspaceRole | null): role is Exclude<WorkspaceRole, "viewer"> => Boolean(role && role !== "viewer");
const manager = (role: WorkspaceRole | null) => role === "owner" || role === "admin";
const compactObject = (value: unknown, maxKeys = 20): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, maxKeys));
};
const cleanStringArray = (value: unknown, maxItems = 20, maxLength = 500) => Array.from(new Set(
  (Array.isArray(value) ? value : []).map((item) => cleanMultiline(item, maxLength)).filter(Boolean),
)).slice(0, maxItems);

const inFilter = (ids: string[]) => ids.join(",");

type ChangeSpecificationRow = {
  id: string;
  organization_id: string;
  project_id: string;
  primary_opportunity_id: string;
  baseline_run_id: string | null;
  control_class: ChangeSpecification["controlClass"];
  control_surface: string | null;
  eligibility_state: ChangeSpecification["eligibilityState"];
  decision_state: ChangeSpecification["decisionState"];
  truth_state: ChangeSpecification["truthState"];
  confidence_state: ChangeSpecification["confidenceState"];
  title: string;
  problem_statement: string;
  exact_change: string | null;
  scope_json: Record<string, unknown>;
  owner_role: string | null;
  owner_id: string | null;
  priority_rank: number | null;
  effort: ChangeSpecification["effort"];
  dependencies_json: string[];
  commercial_relevance_json: Record<string, unknown>;
  recommendation_relevance_json: Record<string, unknown>;
  acceptance_criteria_json: string[];
  verification_plan_json: Record<string, unknown>;
  status: ChangeSpecificationStatus;
  created_by: string;
  submitted_by: string | null;
  submitted_at: string | null;
  decision_by: string | null;
  decision_at: string | null;
  approval_note: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  title: string;
  next_action: string | null;
};

type EvidenceItemRow = {
  id: string;
  verification_status: string;
  source_url: string | null;
  usage_rights: string | null;
  expires_at: string | null;
};

type SourceObservationRow = {
  id: string;
  run_answer_id: string | null;
  review_status: string;
};

type AnswerRow = {
  id: string;
  run_id: string;
  prompt_text: string;
  provider: string;
  model: string | null;
  review_status: string;
};

type RunRow = { id: string };
type EvidenceLinkRow = { change_specification_id: string };

const toDomain = (row: ChangeSpecificationRow): ChangeSpecification => ({
  id: row.id,
  opportunityId: row.primary_opportunity_id,
  baselineRunId: row.baseline_run_id,
  controlClass: row.control_class,
  controlSurface: row.control_surface,
  eligibilityState: row.eligibility_state,
  decisionState: row.decision_state,
  truthState: row.truth_state,
  confidenceState: row.confidence_state,
  title: row.title,
  problemStatement: row.problem_statement,
  exactChange: row.exact_change,
  scope: row.scope_json || {},
  ownerRole: row.owner_role,
  ownerId: row.owner_id,
  priorityRank: row.priority_rank,
  effort: row.effort,
  dependencies: Array.isArray(row.dependencies_json) ? row.dependencies_json : [],
  commercialRelevance: row.commercial_relevance_json || {},
  recommendationRelevance: row.recommendation_relevance_json || {},
  acceptanceCriteria: Array.isArray(row.acceptance_criteria_json) ? row.acceptance_criteria_json : [],
  verificationPlan: row.verification_plan_json || {},
});

const responseRow = (row: ChangeSpecificationRow, evidenceCount: number) => ({
  ...toDomain(row),
  status: row.status,
  linkedEvidenceCount: evidenceCount,
  submittedAt: row.submitted_at,
  decisionAt: row.decision_at,
  approvalNote: row.approval_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function resolveWorkspace(viewer: Viewer) {
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  return { context, role };
}

async function loadSpecification(viewer: Viewer, context: WorkspaceContext, id: string) {
  const rows = await supabaseRest<ChangeSpecificationRow[]>(
    `change_specifications?select=*&id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  return rows[0] || null;
}

async function evidenceCount(viewer: Viewer, context: WorkspaceContext, id: string) {
  const links = await supabaseRest<EvidenceLinkRow[]>(
    `change_specification_evidence?select=change_specification_id&change_specification_id=eq.${encodeURIComponent(id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
    { token: viewer.accessToken },
  );
  return links.length;
}

async function recordAudit(viewer: Viewer, context: WorkspaceContext, input: {
  action: string;
  id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  await supabaseRest("audit_logs", {
    method: "POST",
    token: viewer.accessToken,
    prefer: "return=minimal",
    body: {
      organization_id: context.organizationId,
      actor_id: viewer.id,
      action: input.action,
      entity_type: "change_specification",
      entity_id: input.id,
      before_state: input.before || null,
      after_state: input.after || null,
    },
  });
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" });
  if (!viewer.accessToken) return NextResponse.json({ error: "Your authenticated session is incomplete. Sign in again." }, { status: 401 });
  const { context } = await resolveWorkspace(viewer);
  if (!context) return NextResponse.json({ data: [] });
  try {
    const rows = await supabaseRest<ChangeSpecificationRow[]>(
      `change_specifications?select=*&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=priority_rank.asc.nullslast,created_at.desc`,
      { token: viewer.accessToken },
    );
    const ids = rows.map((row) => row.id);
    const links = ids.length ? await supabaseRest<EvidenceLinkRow[]>(
      `change_specification_evidence?select=change_specification_id&change_specification_id=in.(${inFilter(ids)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`,
      { token: viewer.accessToken },
    ) : [];
    const counts = new Map<string, number>();
    for (const link of links) counts.set(link.change_specification_id, (counts.get(link.change_specification_id) || 0) + 1);
    return NextResponse.json({ data: rows.map((row) => responseRow(row, counts.get(row.id) || 0)) });
  } catch (error) {
    if (isMissingRelationError(error)) return pendingMigrationResponse();
    throw error;
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Use a live workspace to create a Change Specification." }, { status: 409 });
  if (!viewer.accessToken) return NextResponse.json({ error: "Your authenticated session is incomplete. Sign in again." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    action?: string;
    opportunityId?: string;
    baselineRunId?: string | null;
    evidenceItemIds?: string[];
    sourceObservationIds?: string[];
  };
  if (body.action !== "create_from_opportunity") return NextResponse.json({ error: "Unsupported Change Specification action." }, { status: 400 });
  const opportunityId = clean(body.opportunityId, 36);
  const baselineRunId = clean(body.baselineRunId, 36) || null;
  const evidenceItemIds = uniqueIds(body.evidenceItemIds, 20);
  const sourceObservationIds = uniqueIds(body.sourceObservationIds, 20);
  if (!uuid.test(opportunityId)) return NextResponse.json({ error: "Choose a valid opportunity." }, { status: 400 });
  if (baselineRunId && !uuid.test(baselineRunId)) return NextResponse.json({ error: "Choose a valid baseline run." }, { status: 400 });
  if (!evidenceItemIds.length && !sourceObservationIds.length) return NextResponse.json({ error: "Select at least one reviewed evidence record." }, { status: 400 });

  const { context, role } = await resolveWorkspace(viewer);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!writable(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can create Change Specifications." }, { status: 403 });

  try {
    const opportunities = await supabaseRest<OpportunityRow[]>(
      `opportunities?select=id,title,next_action&id=eq.${opportunityId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    );
    const opportunity = opportunities[0];
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found in this workspace." }, { status: 404 });

    if (baselineRunId) {
      const runs = await supabaseRest<RunRow[]>(
        `runs?select=id&id=eq.${baselineRunId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(review,complete,partial)&limit=1`,
        { token: viewer.accessToken },
      );
      if (!runs[0]) return NextResponse.json({ error: "Baseline must be a reviewed run from this workspace." }, { status: 409 });
    }

    const evidenceItems = evidenceItemIds.length ? await supabaseRest<EvidenceItemRow[]>(
      `evidence_items?select=id,verification_status,source_url,usage_rights,expires_at&id=in.(${inFilter(evidenceItemIds)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&verification_status=eq.verified`,
      { token: viewer.accessToken },
    ) : [];
    const now = Date.now();
    const validEvidenceItems = evidenceItems.filter((item) => item.source_url && item.usage_rights?.trim() && (!item.expires_at || new Date(item.expires_at).getTime() > now));
    if (validEvidenceItems.length !== evidenceItemIds.length) {
      return NextResponse.json({ error: "Every evidence item must be current, verified, and linkable in this workspace." }, { status: 409 });
    }

    const observations = sourceObservationIds.length ? await supabaseRest<SourceObservationRow[]>(
      `source_observations?select=id,run_answer_id,review_status&id=in.(${inFilter(sourceObservationIds)})&organization_id=eq.${context.organizationId}&review_status=eq.verified`,
      { token: viewer.accessToken },
    ) : [];
    const answerIds = observations.map((row) => row.run_answer_id).filter((id): id is string => Boolean(id));
    const answers = answerIds.length ? await supabaseRest<AnswerRow[]>(
      `run_answers?select=id,run_id,prompt_text,provider,model,review_status&id=in.(${inFilter(answerIds)})&organization_id=eq.${context.organizationId}&review_status=eq.verified`,
      { token: viewer.accessToken },
    ) : [];
    const validAnswers = answers.filter((answer) => answer.prompt_text.trim() && answer.provider.trim() && answer.model?.trim());
    const runIds = Array.from(new Set(validAnswers.map((answer) => answer.run_id)));
    const runs = runIds.length ? await supabaseRest<RunRow[]>(
      `runs?select=id&id=in.(${inFilter(runIds)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(review,complete,partial)`,
      { token: viewer.accessToken },
    ) : [];
    const projectRunIds = new Set(runs.map((run) => run.id));
    const validAnswerIds = new Set(validAnswers.filter((answer) => projectRunIds.has(answer.run_id)).map((answer) => answer.id));
    const validObservations = observations.filter((observation) => observation.run_answer_id && validAnswerIds.has(observation.run_answer_id));
    if (validObservations.length !== sourceObservationIds.length) {
      return NextResponse.json({ error: "Every source observation must be reviewed and retain persisted question, provider, model, and workspace-run provenance." }, { status: 409 });
    }

    const safeDraft = buildSafeChangeSpecificationDraft({
      opportunityId,
      baselineRunId,
      title: clean(opportunity.title, 200) || "Reviewed recommendation gap",
      problemStatement: cleanMultiline(opportunity.next_action, 2000) || `Reviewed evidence is linked to the opportunity “${clean(opportunity.title, 500)}”. Define the exact company change before submitting this decision for review.`,
    });
    const created = await supabaseRest<ChangeSpecificationRow[]>("change_specifications", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: {
        organization_id: context.organizationId,
        project_id: context.projectId,
        primary_opportunity_id: safeDraft.opportunityId,
        baseline_run_id: safeDraft.baselineRunId,
        control_class: null,
        control_surface: null,
        eligibility_state: safeDraft.eligibilityState,
        decision_state: safeDraft.decisionState,
        truth_state: safeDraft.truthState,
        confidence_state: safeDraft.confidenceState,
        title: safeDraft.title,
        problem_statement: safeDraft.problemStatement,
        exact_change: null,
        scope_json: {},
        owner_role: null,
        owner_id: null,
        priority_rank: null,
        effort: null,
        dependencies_json: [],
        commercial_relevance_json: {},
        recommendation_relevance_json: {},
        acceptance_criteria_json: [],
        verification_plan_json: {},
        status: "draft",
        created_by: viewer.id,
      },
    });
    const specification = created[0];
    if (!specification?.id) return NextResponse.json({ error: "The Change Specification could not be persisted." }, { status: 502 });

    const evidenceBodies = [
      ...validEvidenceItems.map((item) => ({
        organization_id: context.organizationId,
        project_id: context.projectId,
        change_specification_id: specification.id,
        evidence_item_id: item.id,
        source_observation_id: null,
        evidence_snapshot: { verification: "verified" },
      })),
      ...validObservations.map((observation) => ({
        organization_id: context.organizationId,
        project_id: context.projectId,
        change_specification_id: specification.id,
        evidence_item_id: null,
        source_observation_id: observation.id,
        evidence_snapshot: { verification: "verified" },
      })),
    ];
    try {
      await supabaseRest("change_specification_evidence", {
        method: "POST",
        token: viewer.accessToken,
        prefer: "return=minimal",
        body: evidenceBodies,
      });
      await recordAudit(viewer, context, {
        action: "change_specification.created",
        id: specification.id,
        after: {
          opportunity_id: opportunityId,
          baseline_run_id: baselineRunId,
          evidence_item_count: validEvidenceItems.length,
          source_observation_count: validObservations.length,
          status: "draft",
          eligibility_state: "UNKNOWN",
          decision_state: "INSUFFICIENT_EVIDENCE",
          truth_state: "HYPOTHESIS",
          confidence_state: "INSUFFICIENT",
        },
      });
    } catch (error) {
      await supabaseRest(`change_specifications?id=eq.${specification.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, {
        method: "DELETE",
        token: viewer.accessToken,
        prefer: "return=minimal",
      }).catch(() => undefined);
      if (isMissingRelationError(error)) return pendingMigrationResponse();
      return NextResponse.json({ error: "The evidence links or audit record could not be persisted, so the Change Specification was not saved." }, { status: 502 });
    }

    return NextResponse.json({ data: responseRow(specification, evidenceBodies.length) }, { status: 201 });
  } catch (error) {
    if (isMissingRelationError(error)) return pendingMigrationResponse();
    throw error;
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Use a live workspace to change a Change Specification." }, { status: 409 });
  if (!viewer.accessToken) return NextResponse.json({ error: "Your authenticated session is incomplete. Sign in again." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown> & { action?: string; id?: string };
  const action = clean(body.action, 40);
  const id = clean(body.id, 36);
  if (!uuid.test(id)) return NextResponse.json({ error: "Choose a valid Change Specification." }, { status: 400 });
  const { context, role } = await resolveWorkspace(viewer);
  if (!context || !role) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  try {
    const current = await loadSpecification(viewer, context, id);
    if (!current) return NextResponse.json({ error: "Change Specification not found." }, { status: 404 });

    if (action === "update_draft") {
      if (!writable(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can edit Change Specification drafts." }, { status: 403 });
      if (current.status !== "draft") return NextResponse.json({ error: "Only draft Change Specifications can be edited." }, { status: 409 });

      const patch: Record<string, unknown> = {};
      if (body.controlClass !== undefined) {
        if (body.controlClass !== null && !isCanonicalValue(body.controlClass, CONTROL_CLASSES)) return NextResponse.json({ error: "Choose a canonical control class." }, { status: 400 });
        patch.control_class = body.controlClass;
      }
      if (body.controlSurface !== undefined) patch.control_surface = clean(body.controlSurface, 500) || null;
      if (body.eligibilityState !== undefined) {
        if (!isCanonicalValue(body.eligibilityState, ELIGIBILITY_STATES)) return NextResponse.json({ error: "Choose a canonical eligibility state." }, { status: 400 });
        patch.eligibility_state = body.eligibilityState;
      }
      if (body.decisionState !== undefined) {
        if (!isCanonicalValue(body.decisionState, DECISION_STATES)) return NextResponse.json({ error: "Choose a canonical decision state." }, { status: 400 });
        patch.decision_state = body.decisionState;
      }
      if (body.truthState !== undefined) {
        if (!isCanonicalValue(body.truthState, TRUTH_STATES)) return NextResponse.json({ error: "Choose a canonical truth state." }, { status: 400 });
        patch.truth_state = body.truthState;
      }
      if (body.confidenceState !== undefined) {
        if (!isCanonicalValue(body.confidenceState, CONFIDENCE_STATES)) return NextResponse.json({ error: "Choose a canonical confidence state." }, { status: 400 });
        patch.confidence_state = body.confidenceState;
      }
      if (body.title !== undefined) {
        const title = clean(body.title, 200);
        if (title.length < 3) return NextResponse.json({ error: "Record a specific Change Specification title." }, { status: 400 });
        patch.title = title;
      }
      if (body.problemStatement !== undefined) {
        const problem = cleanMultiline(body.problemStatement, 2000);
        if (problem.length < 3) return NextResponse.json({ error: "Record the observed problem before editing the decision." }, { status: 400 });
        patch.problem_statement = problem;
      }
      if (body.exactChange !== undefined) patch.exact_change = cleanMultiline(body.exactChange, 4000) || null;
      if (body.scope !== undefined) patch.scope_json = compactObject(body.scope, 30);
      if (body.ownerRole !== undefined) patch.owner_role = clean(body.ownerRole, 200) || null;
      if (body.ownerId !== undefined) {
        const ownerId = clean(body.ownerId, 36);
        if (ownerId && !uuid.test(ownerId)) return NextResponse.json({ error: "Choose a valid workspace owner." }, { status: 400 });
        patch.owner_id = ownerId || null;
      }
      if (body.priorityRank !== undefined) {
        if (body.priorityRank !== null && (!Number.isInteger(body.priorityRank) || Number(body.priorityRank) < 1 || Number(body.priorityRank) > 10000)) {
          return NextResponse.json({ error: "Priority rank must be a positive integer." }, { status: 400 });
        }
        patch.priority_rank = body.priorityRank;
      }
      if (body.effort !== undefined) {
        if (body.effort !== null && !isCanonicalValue(body.effort, EFFORT_STATES)) return NextResponse.json({ error: "Choose LOW, MEDIUM, or HIGH effort." }, { status: 400 });
        patch.effort = body.effort;
      }
      if (body.dependencies !== undefined) patch.dependencies_json = cleanStringArray(body.dependencies, 20, 500);
      if (body.commercialRelevance !== undefined) patch.commercial_relevance_json = compactObject(body.commercialRelevance, 30);
      if (body.recommendationRelevance !== undefined) patch.recommendation_relevance_json = compactObject(body.recommendationRelevance, 30);
      if (body.acceptanceCriteria !== undefined) patch.acceptance_criteria_json = cleanStringArray(body.acceptanceCriteria, 30, 1000);
      if (body.verificationPlan !== undefined) patch.verification_plan_json = compactObject(body.verificationPlan, 30);
      if (!Object.keys(patch).length) return NextResponse.json({ error: "No draft fields were provided." }, { status: 400 });

      const rows = await supabaseRest<ChangeSpecificationRow[]>(
        `change_specifications?id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=eq.draft`,
        { method: "PATCH", token: viewer.accessToken, prefer: "return=representation", body: patch },
      );
      if (!rows[0]) return NextResponse.json({ error: "The draft could not be updated." }, { status: 409 });
      await recordAudit(viewer, context, { action: "change_specification.draft_updated", id, after: { fields: Object.keys(patch) } });
      return NextResponse.json({ data: responseRow(rows[0], await evidenceCount(viewer, context, id)) });
    }

    if (action === "submit") {
      if (!writable(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can submit Change Specifications." }, { status: 403 });
      if (current.status !== "draft") return NextResponse.json({ error: "Only a draft Change Specification can be submitted." }, { status: 409 });
      const linkedEvidenceCount = await evidenceCount(viewer, context, id);
      const check = validateChangeSpecificationForReview({ ...toDomain(current), linkedEvidenceCount });
      if (!check.ok) {
        return NextResponse.json({ error: "Complete the Change Specification before review.", missing: check.missing, invalid: check.invalid }, { status: 409 });
      }
      const submittedAt = new Date().toISOString();
      const rows = await supabaseRest<ChangeSpecificationRow[]>(
        `change_specifications?id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=eq.draft`,
        {
          method: "PATCH",
          token: viewer.accessToken,
          prefer: "return=representation",
          body: { status: "in_review", submitted_by: viewer.id, submitted_at: submittedAt },
        },
      );
      if (!rows[0]) return NextResponse.json({ error: "The Change Specification could not be submitted." }, { status: 409 });
      await recordAudit(viewer, context, {
        action: "change_specification.submitted",
        id,
        before: { status: "draft" },
        after: { status: "in_review", linked_evidence_count: linkedEvidenceCount },
      });
      return NextResponse.json({ data: responseRow(rows[0], linkedEvidenceCount) });
    }

    if (action === "decision") {
      if (!manager(role)) return NextResponse.json({ error: "Only workspace owners and admins can approve or reject Change Specifications." }, { status: 403 });
      if (current.status !== "in_review") return NextResponse.json({ error: "Only a Change Specification in review can receive a decision." }, { status: 409 });
      const decision = clean(body.decision, 20);
      if (!(["approved", "rejected"] as const).includes(decision as "approved" | "rejected")) {
        return NextResponse.json({ error: "Choose approved or rejected." }, { status: 400 });
      }
      const approvalNote = cleanMultiline(body.approvalNote, 2000) || null;
      const decisionAt = new Date().toISOString();
      const rows = await supabaseRest<ChangeSpecificationRow[]>(
        `change_specifications?id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=eq.in_review`,
        {
          method: "PATCH",
          token: viewer.accessToken,
          prefer: "return=representation",
          body: { status: decision, decision_by: viewer.id, decision_at: decisionAt, approval_note: approvalNote },
        },
      );
      if (!rows[0]) return NextResponse.json({ error: "The Change Specification decision could not be recorded." }, { status: 409 });
      await recordAudit(viewer, context, {
        action: decision === "approved" ? "change_specification.approved" : "change_specification.rejected",
        id,
        before: { status: "in_review" },
        after: { status: decision, approval_note_recorded: Boolean(approvalNote) },
      });
      return NextResponse.json({ data: responseRow(rows[0], await evidenceCount(viewer, context, id)) });
    }

    if (isCanonicalValue(action, CHANGE_SPECIFICATION_STATUSES)) {
      return NextResponse.json({ error: "Execution-state transitions are not exposed by Slice A." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unsupported Change Specification action." }, { status: 400 });
  } catch (error) {
    if (isMissingRelationError(error)) return pendingMigrationResponse();
    throw error;
  }
}
