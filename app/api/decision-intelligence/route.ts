import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext, type WorkspaceRole } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";
import { evaluateEligibility, type EligibilityRequirement } from "@/lib/eligibility-engine";
import { selectCurrentVerifiedTruth, type CompanyTruthAssertion, type CompanyTruthEntityType } from "@/lib/company-truth";
import { sanitizeCommercialEvidenceSnapshot } from "@/lib/cross-business-evidence";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const truthEntityTypes = new Set(["company", "product", "package", "integration", "market", "policy", "proof"]);
const eligibilityOperators = new Set(["EXISTS", "EQUALS", "INCLUDES", "NOT_EQUALS"]);
const eligibilityImportance = new Set(["REQUIRED", "SUPPORTING"]);
const crossBusinessTypes = new Set(["sales_win_loss", "customer_interview", "support", "product_analytics", "feature_request", "churn_retention", "review", "pricing_commercial", "customer_success", "revenue"]);
const crossBusinessDirections = new Set(["supports", "contradicts", "context", "unknown"]);

const writable = (role: WorkspaceRole | null) => role === "owner" || role === "admin" || role === "analyst";
const reviewer = (role: WorkspaceRole | null) => role === "owner" || role === "admin";
const validUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

async function current() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  return { viewer, context, role };
}

type TruthRow = {
  id: string;
  organization_id: string;
  project_id: string;
  entity_id: string;
  attribute_key: string;
  asserted_value_json: unknown;
  evidence_item_id: string | null;
  source_snapshot: Record<string, unknown> | null;
  verification_state: "unverified" | "verified" | "rejected" | "superseded" | "expired";
  effective_at: string;
  superseded_at: string | null;
  verified_at: string | null;
  entity: { entity_type: CompanyTruthEntityType; label: string; canonical_key: string } | null;
};

type RequirementRow = {
  id: string;
  entity_type: CompanyTruthEntityType;
  attribute_key: string;
  operator: "EXISTS" | "EQUALS" | "INCLUDES" | "NOT_EQUALS";
  expected_value_json: unknown;
  importance: "REQUIRED" | "SUPPORTING";
  review_status: "draft" | "verified" | "rejected";
  source_snapshot: Record<string, unknown> | null;
};

type EvaluationRow = {
  id: string;
  state: "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "STRUCTURALLY_INELIGIBLE" | "UNKNOWN";
  reason_codes_json: string[];
  results_json: unknown[];
  requirement_count: number;
  truth_assertion_count: number;
  engine_version: string;
  evaluated_at: string;
};

type ChangeRow = { id: string; status: string; eligibility_state: string };

type LinkedCrossBusinessRow = {
  id: string;
  evidence: {
    id: string;
    evidence_type: string;
    title: string;
    summary: string;
    direction: string;
    source_system: string;
    source_snapshot: Record<string, unknown> | null;
    occurred_at: string | null;
    verified_at: string | null;
  } | null;
};

function mapTruth(rows: TruthRow[]): CompanyTruthAssertion[] {
  return rows.flatMap((row) => row.entity ? [{
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    entityId: row.entity_id,
    entityType: row.entity.entity_type,
    attributeKey: row.attribute_key,
    assertedValue: row.asserted_value_json,
    evidenceItemId: row.evidence_item_id,
    sourceSnapshot: row.source_snapshot || {},
    verificationState: row.verification_state,
    effectiveAt: row.effective_at,
    supersededAt: row.superseded_at,
    verifiedAt: row.verified_at,
  }] : []);
}

async function loadChange(token: string, organizationId: string, projectId: string, id: string) {
  const rows = await supabaseRest<ChangeRow[]>(
    `change_specifications?select=id,status,eligibility_state&id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(organizationId)}&project_id=eq.${encodeURIComponent(projectId)}&limit=1`,
    { token },
  );
  return rows[0] || null;
}

async function audit(organizationId: string, actorId: string, action: string, entityType: string, entityId: string | null, afterState: Record<string, unknown>) {
  try {
    await supabaseRest("audit_logs", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: { organization_id: organizationId, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, after_state: afterState },
    });
  } catch {
    // Audit failure must not manufacture a successful business mutation; callers still rely on DB history.
  }
}

export async function GET(request: Request) {
  const active = await current();
  if (!active) return responseError("Authentication required.", 401);
  const { viewer, context } = active;
  if (viewer.mode === "demo") {
    return NextResponse.json({
      mode: "demo",
      pendingMigration: false,
      companyTruth: [],
      requirements: [],
      latestEligibility: null,
      crossBusinessEvidence: [],
      counts: { verifiedTruth: 0, verifiedRequirements: 0, crossBusinessEvidence: 0 },
    }, { headers: { "cache-control": "no-store" } });
  }
  if (!context || !viewer.accessToken) return responseError("Workspace not found.", 404);

  const changeSpecificationId = new URL(request.url).searchParams.get("changeSpecificationId");
  if (changeSpecificationId && !validUuid(changeSpecificationId)) return responseError("Choose a valid Change Specification.", 400);

  try {
    if (changeSpecificationId && !(await loadChange(viewer.accessToken, context.organizationId, context.projectId, changeSpecificationId))) {
      return responseError("Change Specification not found.", 404);
    }

    const truthRows = await supabaseRest<TruthRow[]>(
      `company_truth_assertions?select=id,organization_id,project_id,entity_id,attribute_key,asserted_value_json,evidence_item_id,source_snapshot,verification_state,effective_at,superseded_at,verified_at,entity:company_truth_entities(entity_type,label,canonical_key)&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&verification_state=eq.verified&superseded_at=is.null&order=verified_at.desc&limit=300`,
      { token: viewer.accessToken },
    );
    const companyTruth = selectCurrentVerifiedTruth(mapTruth(truthRows));

    let requirements: RequirementRow[] = [];
    let latestEligibility: EvaluationRow | null = null;
    let linkedEvidence: LinkedCrossBusinessRow[] = [];
    if (changeSpecificationId) {
      [requirements, linkedEvidence] = await Promise.all([
        supabaseRest<RequirementRow[]>(
          `eligibility_requirements?select=id,entity_type,attribute_key,operator,expected_value_json,importance,review_status,source_snapshot&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&order=created_at.asc&limit=200`,
          { token: viewer.accessToken },
        ),
        supabaseRest<LinkedCrossBusinessRow[]>(
          `change_specification_cross_business_evidence?select=id,evidence:cross_business_evidence(id,evidence_type,title,summary,direction,source_system,source_snapshot,occurred_at,verified_at)&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&order=created_at.desc&limit=200`,
          { token: viewer.accessToken },
        ),
      ]);
      const evaluations = await supabaseRest<EvaluationRow[]>(
        `eligibility_evaluations?select=id,state,reason_codes_json,results_json,requirement_count,truth_assertion_count,engine_version,evaluated_at&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(changeSpecificationId)}&order=evaluated_at.desc&limit=1`,
        { token: viewer.accessToken },
      );
      latestEligibility = evaluations[0] || null;
    }

    const crossBusinessEvidence = linkedEvidence.flatMap((row) => row.evidence ? [row.evidence] : []);
    return NextResponse.json({
      mode: "live",
      pendingMigration: false,
      companyTruth,
      requirements,
      latestEligibility,
      crossBusinessEvidence,
      counts: {
        verifiedTruth: companyTruth.length,
        verifiedRequirements: requirements.filter((item) => item.review_status === "verified").length,
        crossBusinessEvidence: crossBusinessEvidence.length,
      },
    }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({ mode: "live", pendingMigration: true, companyTruth: [], requirements: [], latestEligibility: null, crossBusinessEvidence: [], counts: { verifiedTruth: 0, verifiedRequirements: 0, crossBusinessEvidence: 0 } }, { headers: { "cache-control": "no-store" } });
    }
    console.error("Decision Intelligence read failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Decision intelligence is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const active = await current();
  if (!active) return responseError("Authentication required.", 401);
  const { viewer, context, role } = active;
  if (viewer.mode === "demo") return responseError("Demo workspaces cannot modify decision intelligence.", 403);
  if (!context || !viewer.accessToken || !role) return responseError("Workspace not found.", 404);

  const body = asObject(await request.json().catch(() => ({})));
  const action = text(body.action, 80);
  const token = viewer.accessToken;

  try {
    if (action === "create_truth_entity") {
      if (!writable(role)) return responseError("This workspace role cannot create Company Truth entities.", 403);
      const entityType = text(body.entityType, 30);
      const canonicalKey = text(body.canonicalKey, 120).toLowerCase();
      const label = text(body.label, 200);
      if (!truthEntityTypes.has(entityType) || !canonicalKey || !label) return responseError("Entity type, key, and label are required.", 400);
      const rows = await supabaseRest<Array<{ id: string }>>("company_truth_entities?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, entity_type: entityType, canonical_key: canonicalKey, label, created_by: viewer.id } });
      return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
    }

    if (action === "create_truth_assertion") {
      if (!writable(role)) return responseError("This workspace role cannot create Company Truth assertions.", 403);
      if (!validUuid(body.entityId)) return responseError("Choose a valid Company Truth entity.", 400);
      const attributeKey = text(body.attributeKey, 120).toLowerCase();
      if (!attributeKey || !("assertedValue" in body)) return responseError("Attribute and asserted value are required.", 400);
      const evidenceItemId = validUuid(body.evidenceItemId) ? body.evidenceItemId : null;
      const rows = await supabaseRest<Array<{ id: string }>>("company_truth_assertions?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, entity_id: body.entityId, attribute_key: attributeKey, asserted_value_json: body.assertedValue, evidence_item_id: evidenceItemId, verification_state: "unverified", created_by: viewer.id } });
      return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
    }

    if (action === "verify_truth_assertion") {
      if (!reviewer(role) || !validUuid(body.assertionId)) return responseError("Owner or admin review is required.", 403);
      const rows = await supabaseRest<Array<{ id: string }>>(`company_truth_assertions?id=eq.${encodeURIComponent(body.assertionId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&select=id`, { method: "PATCH", token, prefer: "return=representation", body: { verification_state: "verified", verified_by: viewer.id } });
      if (!rows[0]) return responseError("Company Truth assertion not found.", 404);
      await audit(context.organizationId, viewer.id, "company_truth.verified", "company_truth_assertion", rows[0].id, { verificationState: "verified" });
      return NextResponse.json({ id: rows[0].id, verificationState: "verified" });
    }

    if (action === "supersede_truth_assertion") {
      if (!reviewer(role) || !validUuid(body.assertionId)) return responseError("Owner or admin review is required.", 403);
      const rows = await supabaseRest<Array<{ id: string }>>(`company_truth_assertions?id=eq.${encodeURIComponent(body.assertionId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&verification_state=eq.verified&select=id`, { method: "PATCH", token, prefer: "return=representation", body: { verification_state: "superseded", superseded_at: new Date().toISOString() } });
      if (!rows[0]) return responseError("Verified Company Truth assertion not found.", 404);
      await audit(context.organizationId, viewer.id, "company_truth.superseded", "company_truth_assertion", rows[0].id, { verificationState: "superseded" });
      return NextResponse.json({ id: rows[0].id, verificationState: "superseded" });
    }

    if (action === "create_eligibility_requirement") {
      if (!writable(role) || !validUuid(body.changeSpecificationId)) return responseError("A valid Change Specification is required.", 400);
      const change = await loadChange(token, context.organizationId, context.projectId, body.changeSpecificationId);
      if (!change) return responseError("Change Specification not found.", 404);
      const entityType = text(body.entityType, 30);
      const attributeKey = text(body.attributeKey, 120).toLowerCase();
      const operator = text(body.operator, 20).toUpperCase();
      const importance = text(body.importance, 20).toUpperCase();
      if (!truthEntityTypes.has(entityType) || !attributeKey || !eligibilityOperators.has(operator) || !eligibilityImportance.has(importance)) return responseError("Complete the eligibility requirement fields.", 400);
      const evidenceItemId = validUuid(body.evidenceItemId) ? body.evidenceItemId : null;
      const sourceObservationId = validUuid(body.sourceObservationId) ? body.sourceObservationId : null;
      const rows = await supabaseRest<Array<{ id: string }>>("eligibility_requirements?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, change_specification_id: change.id, entity_type: entityType, attribute_key: attributeKey, operator, expected_value_json: body.expectedValue ?? null, importance, evidence_item_id: evidenceItemId, source_observation_id: sourceObservationId, review_status: "draft", created_by: viewer.id } });
      return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
    }

    if (action === "verify_eligibility_requirement") {
      if (!reviewer(role) || !validUuid(body.requirementId)) return responseError("Owner or admin review is required.", 403);
      const rows = await supabaseRest<Array<{ id: string }>>(`eligibility_requirements?id=eq.${encodeURIComponent(body.requirementId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&select=id`, { method: "PATCH", token, prefer: "return=representation", body: { review_status: "verified", verified_by: viewer.id } });
      if (!rows[0]) return responseError("Eligibility requirement not found.", 404);
      await audit(context.organizationId, viewer.id, "eligibility.requirement_verified", "eligibility_requirement", rows[0].id, { reviewStatus: "verified" });
      return NextResponse.json({ id: rows[0].id, reviewStatus: "verified" });
    }

    if (action === "evaluate_eligibility") {
      if (!writable(role) || !validUuid(body.changeSpecificationId)) return responseError("A valid Change Specification is required.", 400);
      const change = await loadChange(token, context.organizationId, context.projectId, body.changeSpecificationId);
      if (!change) return responseError("Change Specification not found.", 404);
      const [requirementRows, truthRows] = await Promise.all([
        supabaseRest<RequirementRow[]>(`eligibility_requirements?select=id,entity_type,attribute_key,operator,expected_value_json,importance,review_status,source_snapshot&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&change_specification_id=eq.${encodeURIComponent(change.id)}&review_status=eq.verified&order=created_at.asc&limit=200`, { token }),
        supabaseRest<TruthRow[]>(`company_truth_assertions?select=id,organization_id,project_id,entity_id,attribute_key,asserted_value_json,evidence_item_id,source_snapshot,verification_state,effective_at,superseded_at,verified_at,entity:company_truth_entities(entity_type,label,canonical_key)&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&verification_state=eq.verified&superseded_at=is.null&limit=300`, { token }),
      ]);
      const requirements: EligibilityRequirement[] = requirementRows.map((row) => ({ id: row.id, entityType: row.entity_type, attributeKey: row.attribute_key, operator: row.operator, expectedValue: row.expected_value_json, importance: row.importance, reviewStatus: row.review_status }));
      const truths = selectCurrentVerifiedTruth(mapTruth(truthRows));
      const evaluation = evaluateEligibility(requirements, truths);
      const inserted = await supabaseRest<Array<{ id: string }>>("eligibility_evaluations?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, change_specification_id: change.id, state: evaluation.state, reason_codes_json: evaluation.reasonCodes, results_json: evaluation.results, requirement_count: evaluation.requirementCount, truth_assertion_count: evaluation.truthAssertionCount, engine_version: evaluation.engineVersion, evaluated_by: viewer.id } });
      if (change.status === "draft") {
        await supabaseRest(`change_specifications?id=eq.${encodeURIComponent(change.id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&status=eq.draft`, { method: "PATCH", token, prefer: "return=minimal", body: { eligibility_state: evaluation.state } });
      }
      await audit(context.organizationId, viewer.id, "eligibility.evaluated", "change_specification", change.id, { evaluationId: inserted[0]?.id || null, eligibilityState: evaluation.state, reasonCodes: evaluation.reasonCodes });
      return NextResponse.json({ id: inserted[0]?.id, evaluation });
    }

    if (action === "create_cross_business_evidence") {
      if (!writable(role)) return responseError("This workspace role cannot create cross-business evidence.", 403);
      const evidenceType = text(body.evidenceType, 40);
      const title = text(body.title, 240);
      const summary = text(body.summary, 2000);
      const direction = text(body.direction, 20) || "unknown";
      if (!crossBusinessTypes.has(evidenceType) || !crossBusinessDirections.has(direction) || !title || !summary || !validUuid(body.evidenceItemId)) return responseError("Source-backed evidence type, title, summary, direction, and evidence item are required.", 400);
      const rows = await supabaseRest<Array<{ id: string }>>("cross_business_evidence?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, evidence_type: evidenceType, title, summary, direction, evidence_item_id: body.evidenceItemId, source_system: "workspace_evidence", verification_state: "unverified", occurred_at: typeof body.occurredAt === "string" ? body.occurredAt : null, created_by: viewer.id } });
      return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
    }

    if (action === "verify_cross_business_evidence") {
      if (!reviewer(role) || !validUuid(body.evidenceId)) return responseError("Owner or admin review is required.", 403);
      const rows = await supabaseRest<Array<{ id: string }>>(`cross_business_evidence?id=eq.${encodeURIComponent(body.evidenceId)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&select=id`, { method: "PATCH", token, prefer: "return=representation", body: { verification_state: "verified", verified_by: viewer.id } });
      if (!rows[0]) return responseError("Cross-business evidence not found.", 404);
      await audit(context.organizationId, viewer.id, "cross_business_evidence.verified", "cross_business_evidence", rows[0].id, { verificationState: "verified" });
      return NextResponse.json({ id: rows[0].id, verificationState: "verified" });
    }

    if (action === "link_cross_business_evidence") {
      if (!writable(role) || !validUuid(body.changeSpecificationId) || !validUuid(body.evidenceId)) return responseError("Valid Change Specification and evidence identifiers are required.", 400);
      const change = await loadChange(token, context.organizationId, context.projectId, body.changeSpecificationId);
      if (!change) return responseError("Change Specification not found.", 404);
      const rows = await supabaseRest<Array<{ id: string }>>("change_specification_cross_business_evidence?select=id", { method: "POST", token, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, change_specification_id: change.id, cross_business_evidence_id: body.evidenceId, created_by: viewer.id } });
      await audit(context.organizationId, viewer.id, "cross_business_evidence.linked", "change_specification", change.id, { linkId: rows[0]?.id || null, evidenceId: body.evidenceId });
      return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
    }

    if (action === "import_commercial_evidence") {
      if (!reviewer(role) || !validUuid(body.sourceId)) return responseError("Owner or admin review and a valid commercial source are required.", 403);
      const sourceKind = body.sourceKind === "event" ? "event" : body.sourceKind === "opportunity" ? "opportunity" : null;
      if (!sourceKind) return responseError("Choose a supported commercial source type.", 400);

      if (sourceKind === "event") {
        const events = await supabaseRest<Array<{ id: string; account_id: string; event_type: string; occurred_at: string }>>(`commercial_events?select=id,account_id,event_type,occurred_at&id=eq.${encodeURIComponent(body.sourceId)}&limit=1`, { serviceRole: true });
        const event = events[0];
        if (!event) return responseError("Commercial event not found.", 404);
        const accounts = await supabaseRest<Array<{ id: string; customer_organization_id: string | null }>>(`commercial_accounts?select=id,customer_organization_id&id=eq.${encodeURIComponent(event.account_id)}&customer_organization_id=eq.${encodeURIComponent(context.organizationId)}&limit=1`, { serviceRole: true });
        if (!accounts[0]) return responseError("Commercial evidence is not explicitly linked to this customer organization.", 403);
        const snapshot = sanitizeCommercialEvidenceSnapshot({ kind: "event", id: event.id, eventType: event.event_type, occurredAt: event.occurred_at });
        const rows = await supabaseRest<Array<{ id: string }>>("cross_business_evidence?select=id", { method: "POST", serviceRole: true, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, evidence_type: "pricing_commercial", title: `Commercial event: ${event.event_type}`.slice(0, 240), summary: `Observed first-party commercial event recorded at ${event.occurred_at}.`, direction: "context", commercial_event_id: event.id, source_system: "foremention_commercial", source_reference: event.id, source_snapshot: snapshot, verification_state: "verified", occurred_at: event.occurred_at, created_by: viewer.id, verified_by: viewer.id } });
        await audit(context.organizationId, viewer.id, "cross_business_evidence.commercial_imported", "cross_business_evidence", rows[0]?.id || null, { sourceKind: "event", sourceId: event.id });
        return NextResponse.json({ id: rows[0]?.id, verificationState: "verified" }, { status: 201 });
      }

      const opportunities = await supabaseRest<Array<{ id: string; account_id: string; stage: string; commercial_model: string; currency: string; accepted_value_usd: number | null; paid_value_usd: number | null; mrr_usd: number | null; arr_usd: number | null; revenue_source: string; closed_at: string | null }>>(`commercial_opportunities?select=id,account_id,stage,commercial_model,currency,accepted_value_usd,paid_value_usd,mrr_usd,arr_usd,revenue_source,closed_at&id=eq.${encodeURIComponent(body.sourceId)}&limit=1`, { serviceRole: true });
      const opportunity = opportunities[0];
      if (!opportunity) return responseError("Commercial opportunity not found.", 404);
      const accounts = await supabaseRest<Array<{ id: string; customer_organization_id: string | null }>>(`commercial_accounts?select=id,customer_organization_id&id=eq.${encodeURIComponent(opportunity.account_id)}&customer_organization_id=eq.${encodeURIComponent(context.organizationId)}&limit=1`, { serviceRole: true });
      if (!accounts[0]) return responseError("Commercial evidence is not explicitly linked to this customer organization.", 403);
      const snapshot = sanitizeCommercialEvidenceSnapshot({ kind: "opportunity", id: opportunity.id, stage: opportunity.stage, commercialModel: opportunity.commercial_model, currency: opportunity.currency, acceptedValueUsd: opportunity.accepted_value_usd, paidValueUsd: opportunity.paid_value_usd, mrrUsd: opportunity.mrr_usd, arrUsd: opportunity.arr_usd, revenueSource: opportunity.revenue_source, closedAt: opportunity.closed_at });
      const rows = await supabaseRest<Array<{ id: string }>>("cross_business_evidence?select=id", { method: "POST", serviceRole: true, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, evidence_type: opportunity.stage === "lost" ? "sales_win_loss" : opportunity.paid_value_usd ? "revenue" : "pricing_commercial", title: `Commercial opportunity: ${opportunity.stage}`.slice(0, 240), summary: "Observed first-party commercial opportunity context from an explicitly linked customer organization.", direction: "context", commercial_opportunity_id: opportunity.id, source_system: "foremention_commercial", source_reference: opportunity.id, source_snapshot: snapshot, verification_state: "verified", occurred_at: opportunity.closed_at, created_by: viewer.id, verified_by: viewer.id } });
      await audit(context.organizationId, viewer.id, "cross_business_evidence.commercial_imported", "cross_business_evidence", rows[0]?.id || null, { sourceKind: "opportunity", sourceId: opportunity.id });
      return NextResponse.json({ id: rows[0]?.id, verificationState: "verified" }, { status: 201 });
    }

    return responseError("Choose a supported Decision Intelligence action.", 400);
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Decision Intelligence is waiting for the current database migration.", 503);
    console.error("Decision Intelligence mutation failed.", { action, error: error instanceof Error ? error.message : String(error) });
    return responseError("Decision Intelligence could not complete this request.", 400);
  }
}
