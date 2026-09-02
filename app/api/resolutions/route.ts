import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext, type WorkspaceContext, type WorkspaceRole } from "@/lib/data";
import {
  buildResolutionProposal,
  RESOLUTION_ASSET_TYPES,
  type ResolutionAssetType,
  type ResolutionProblem,
  type VerifiedResolutionEvidence,
} from "@/lib/resolution-engine";
import { finalizeResolutionFollowUpsForRun } from "@/lib/resolution-follow-ups";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";

const PENDING_MIGRATION = "Resolution Center is not enabled for this workspace yet. A workspace owner must apply the pending Foremention database migration before resolution records can be created or read.";
const pendingMigrationResponse = () => NextResponse.json({ error: PENDING_MIGRATION, status: "pending_migration" }, { status: 503 });

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
const cleanMultiline = (value: unknown, limit: number) => typeof value === "string"
  ? value.replace(/\r\n?/g, "\n").replace(/[\t ]+\n/g, "\n").trim().slice(0, limit)
  : "";
const uniqueIds = (value: unknown) => Array.from(new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && uuid.test(id)) : [])).slice(0, 20);
const writable = (role: WorkspaceRole | null): role is Exclude<WorkspaceRole, "viewer"> => Boolean(role && role !== "viewer");
const manager = (role: WorkspaceRole | null) => role === "owner" || role === "admin";

type AssetRow = {
  id: string; organization_id: string; project_id: string; opportunity_id: string; source_id: string; baseline_run_id: string | null;
  asset_type: ResolutionAssetType; title: string; problem_statement: string; proposal: Record<string, unknown>; limitations: string[];
  generation_version: string; customer_edited_at: string | null; status: "draft" | "in_review" | "approved" | "applied";
  review_decision: "pending" | "approved" | "changes_requested" | "rejected"; created_by: string;
  submitted_by: string | null; submitted_at: string | null; approved_by: string | null; approved_at: string | null; decision_by: string | null; decision_at: string | null; approval_note: string | null;
  applied_by: string | null; applied_at: string | null; application_reference: string | null; application_note: string | null;
  created_at: string; updated_at: string;
};
type OpportunityRow = { id: string; title: string; next_action: string | null; source_id: string; created_at?: string };
type SourceRow = { id: string; canonical_url: string; page_title: string | null };
type EvidenceLinkRow = { resolution_asset_id: string; evidence_snapshot: VerifiedResolutionEvidence };
type FollowUpRow = {
  id: string; resolution_asset_id: string; baseline_run_id: string; rerun_id: string | null; status: "requested" | "queued" | "complete" | "incomparable" | "failed" | "cancelled";
  requested_at: string; completed_at: string | null; outcome: Record<string, unknown>; limitation: string;
};
type RunRow = {
  id: string; status: string; provider_ids: string[]; brand_presence_pct: number | string; first_mention_pct: number | string;
  citation_count: number; new_source_count: number; completed_at: string | null; created_at: string;
};
type ChangeSpecificationRow = {
  id: string;
  organization_id: string;
  project_id: string;
  primary_opportunity_id: string;
  status: "draft" | "in_review" | "approved" | "in_execution" | "completed" | "rejected";
};
type ChangeExecutionAssetRow = { change_specification_id: string };

async function resolveWorkspace(viewer: Viewer) {
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  return { context, role };
}

const inFilter = (ids: string[]) => ids.join(",");
const uiAssetType = (value: ResolutionAssetType) => value === "comparison_brief" ? "comparison_page" : value === "faq_evidence_brief" ? "faq" : "content_brief";
const internalAssetType = (value: string): ResolutionAssetType => value === "comparison_page" ? "comparison_brief" : ["faq", "proof_page"].includes(value) ? "faq_evidence_brief" : "source_page_brief";
const uiEvidence = (entry: VerifiedResolutionEvidence) => ({
  id: entry.id,
  kind: entry.kind,
  title: entry.title,
  detail: entry.excerpt || entry.question || "A dated record was verified in this workspace. Open the linked evidence before using it in an asset.",
  sourceUrl: entry.url,
  observedAt: entry.observedAt,
  runId: entry.runId,
});
const proposalContent = (proposal: Record<string, unknown>) => {
  const sections = Array.isArray(proposal.draftSections) ? proposal.draftSections as Array<Record<string, unknown>> : [];
  return sections.map((section) => `${clean(section.heading, 300)}\n${cleanMultiline(section.guidance, 5000)}`).filter((value) => value.trim()).join("\n\n");
};
const latestDate = (evidence: VerifiedResolutionEvidence[], fallback: string) => evidence.map((entry) => entry.observedAt).filter((value): value is string => Boolean(value)).sort().at(-1) || fallback;
const uniqueViolation = (error: unknown) => error instanceof SupabaseRequestError && error.code === "23505";
const allowedGenerationAssetTypes = ["comparison_page", "faq", "content_brief"] as const;
const parseGenerateAssetType = (value: unknown): ResolutionAssetType | null => {
  const cleaned = clean(value, 40);
  if (!cleaned) return "source_page_brief";
  if (RESOLUTION_ASSET_TYPES.includes(cleaned as ResolutionAssetType)) return cleaned as ResolutionAssetType;
  if (!allowedGenerationAssetTypes.includes(cleaned as (typeof allowedGenerationAssetTypes)[number])) return null;
  return internalAssetType(cleaned);
};
const executionRoleFor = (value: ResolutionAssetType) => value === "comparison_brief" ? "comparison" : value === "faq_evidence_brief" ? "faq" : "website";

async function loadResolutionRecords(viewer: Viewer, context: WorkspaceContext) {
  const [assets, opportunities] = await Promise.all([
    supabaseRest<AssetRow[]>(
      `resolution_assets?select=id,organization_id,project_id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,proposal,limitations,generation_version,customer_edited_at,status,review_decision,created_by,submitted_by,submitted_at,approved_by,approved_at,decision_by,decision_at,approval_note,applied_by,applied_at,application_reference,application_note,created_at,updated_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
      { token: viewer.accessToken },
    ),
    supabaseRest<OpportunityRow[]>(`opportunities?select=id,title,next_action,source_id,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(open,qualified,approved,in_progress)&order=created_at.desc&limit=100`, { token: viewer.accessToken }),
  ]);
  const assetIds = assets.map((row) => row.id);
  const sourceIds = Array.from(new Set([...assets.map((row) => row.source_id), ...opportunities.map((row) => row.source_id)]));
  const [sources, evidenceLinks, followUps, observations] = await Promise.all([
    sourceIds.length ? supabaseRest<SourceRow[]>(`sources?select=id,canonical_url,page_title&id=in.(${inFilter(sourceIds)})&organization_id=eq.${context.organizationId}`, { token: viewer.accessToken }) : [],
    assetIds.length ? supabaseRest<EvidenceLinkRow[]>(`resolution_asset_evidence?select=resolution_asset_id,evidence_snapshot&resolution_asset_id=in.(${inFilter(assetIds)})&organization_id=eq.${context.organizationId}&order=created_at.asc`, { token: viewer.accessToken }) : [],
    assetIds.length ? supabaseRest<FollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&resolution_asset_id=in.(${inFilter(assetIds)})&organization_id=eq.${context.organizationId}&order=requested_at.desc`, { token: viewer.accessToken }) : [],
    sourceIds.length ? supabaseRest<Array<{ id: string; source_id: string; run_answer_id: string | null; provider: string; observed_at: string }>>(`source_observations?select=id,source_id,run_answer_id,provider,observed_at&organization_id=eq.${context.organizationId}&source_id=in.(${inFilter(sourceIds)})&review_status=eq.verified&order=observed_at.desc&limit=500`, { token: viewer.accessToken }) : [],
  ]);
  const observationAnswerIds = observations.map((row) => row.run_answer_id).filter((id): id is string => Boolean(id));
  const observedAnswers = observationAnswerIds.length ? await supabaseRest<Array<{ id: string; run_id: string; provider: string; model: string | null; answer_text: string; review_status: string }>>(`run_answers?select=id,run_id,provider,model,answer_text,review_status&id=in.(${inFilter(observationAnswerIds)})&organization_id=eq.${context.organizationId}&review_status=eq.verified`, { token: viewer.accessToken }) : [];
  const observedRunIds = Array.from(new Set(observedAnswers.map((row) => row.run_id)));
  const projectRuns = observedRunIds.length ? await supabaseRest<Array<{ id: string }>>(
    `runs?select=id&id=in.(${inFilter(observedRunIds)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(review,complete,partial)`,
    { token: viewer.accessToken },
  ) : [];
  const projectRunIds = new Set(projectRuns.map((row) => row.id));
  const opportunityById = new Map(opportunities.map((row) => [row.id, row]));
  const sourceById = new Map(sources.map((row) => [row.id, row]));
  const answerById = new Map(observedAnswers.filter((row) => projectRunIds.has(row.run_id)).map((row) => [row.id, row]));
  const observationsBySource = new Map<string, VerifiedResolutionEvidence[]>();
  for (const observation of observations) {
    const answer = observation.run_answer_id ? answerById.get(observation.run_answer_id) : null;
    const source = sourceById.get(observation.source_id);
    if (!answer || !source) continue;
    const snapshot: VerifiedResolutionEvidence = { id: observation.id, kind: "source_observation", title: source.page_title || source.canonical_url, url: source.canonical_url, observedAt: observation.observed_at, provider: answer.provider || observation.provider, model: answer.model, question: null, excerpt: clean(answer.answer_text, 500) || null, runId: answer.run_id, verification: "verified" };
    observationsBySource.set(observation.source_id, [...(observationsBySource.get(observation.source_id) || []), snapshot]);
  }
  const assetRecords = assets.map((asset) => {
    const problem = opportunityById.get(asset.opportunity_id);
    const source = sourceById.get(asset.source_id);
    const followUp = followUps.find((row) => row.resolution_asset_id === asset.id) || null;
    const evidence = evidenceLinks.filter((row) => row.resolution_asset_id === asset.id).map((row) => row.evidence_snapshot);
    const objective = clean(asset.proposal.objective, 1200);
    const content = proposalContent(asset.proposal);
    const outcomeSummary = followUp ? clean(followUp.outcome.interpretation, 1000) || null : null;
    return {
      id: asset.id,
      status: asset.status,
      problem: {
        id: asset.opportunity_id,
        type: "source_gap",
        title: problem?.title || asset.problem_statement,
        summary: problem?.next_action || `Resolve the reviewed evidence gap associated with ${source?.page_title || source?.canonical_url || "this source"}.`,
        confidence: evidence.length ? "reviewed evidence" : "insufficient evidence",
        observedAt: latestDate(evidence, asset.created_at),
      },
      evidence: evidence.map(uiEvidence),
      proposal: { assetType: uiAssetType(asset.asset_type), title: asset.title, summary: objective || asset.problem_statement, content, limitations: asset.limitations.join("\n"), version: asset.customer_edited_at ? 2 : 1, updatedAt: asset.updated_at },
      approval: { status: asset.review_decision, note: asset.approval_note || "", decidedAt: asset.decision_at, decidedBy: asset.decision_by },
      application: { status: asset.status === "applied" ? "applied" : "not_applied", targetUrl: asset.application_reference || "", appliedAt: asset.applied_at, error: null },
      followUp: followUp ? { status: followUp.status, baselineRunId: followUp.baseline_run_id, followUpRunId: followUp.rerun_id, requestedAt: followUp.requested_at, completedAt: followUp.completed_at, summary: outcomeSummary } : { status: "not_requested", baselineRunId: asset.baseline_run_id, followUpRunId: null, requestedAt: null, completedAt: null, summary: null },
    };
  });
  const resolvedProblems = new Set(assets.map((row) => row.opportunity_id));
  const problemRecords = opportunities.filter((problem) => !resolvedProblems.has(problem.id)).flatMap((problem) => {
    const evidence = observationsBySource.get(problem.source_id) || [];
    const source = sourceById.get(problem.source_id);
    if (!evidence.length || !source) return [];
    return [{
      id: `problem-${problem.id}`,
      status: "observed",
      problem: { id: problem.id, type: "source_gap", title: problem.title, summary: problem.next_action || `Review a legitimate response to the gap observed on ${source.page_title || source.canonical_url}.`, confidence: "reviewed evidence", observedAt: latestDate(evidence, new Date(0).toISOString()) },
      evidence: evidence.map(uiEvidence),
      proposal: null,
      approval: { status: "pending", note: "", decidedAt: null, decidedBy: null },
      application: { status: "not_applied", targetUrl: "", appliedAt: null, error: null },
      followUp: { status: "not_requested", baselineRunId: null, followUpRunId: null, requestedAt: null, completedAt: null, summary: null },
    }];
  });
  return [...assetRecords, ...problemRecords];
}

async function findProblem(viewer: Viewer, context: WorkspaceContext, problemId: string) {
  const opportunities = await supabaseRest<OpportunityRow[]>(
    `opportunities?select=id,title,next_action,source_id&id=eq.${problemId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const opportunity = opportunities[0];
  if (!opportunity) return null;
  const sources = await supabaseRest<SourceRow[]>(
    `sources?select=id,canonical_url,page_title&id=eq.${opportunity.source_id}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const source = sources[0];
  if (!source) return null;
  return { id: opportunity.id, title: opportunity.title, nextAction: opportunity.next_action, sourceId: source.id, sourceTitle: source.page_title, sourceUrl: source.canonical_url } satisfies ResolutionProblem;
}

async function loadChangeSpecification(viewer: Viewer, context: WorkspaceContext, id: string) {
  const rows = await supabaseRest<ChangeSpecificationRow[]>(
    `change_specifications?select=id,organization_id,project_id,primary_opportunity_id,status&id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  return rows[0] || null;
}

async function loadVerifiedEvidence(input: { viewer: Viewer; context: WorkspaceContext; problem: ResolutionProblem; evidenceItemIds: string[]; sourceObservationIds: string[] }) {
  const { viewer, context, problem } = input;
  const observationFilter = input.sourceObservationIds.length ? `&id=in.(${inFilter(input.sourceObservationIds)})` : "";
  const observations = await supabaseRest<Array<{ id: string; run_answer_id: string | null; provider: string; observed_at: string; review_status: string }>>(
    `source_observations?select=id,run_answer_id,provider,observed_at,review_status&organization_id=eq.${context.organizationId}&source_id=eq.${problem.sourceId}&review_status=eq.verified${observationFilter}&order=observed_at.desc&limit=20`,
    { token: viewer.accessToken },
  );
  const answerIds = observations.map((row) => row.run_answer_id).filter((id): id is string => Boolean(id));
  const candidateAnswers = answerIds.length ? await supabaseRest<Array<{ id: string; run_id: string; prompt_id: string | null; prompt_text: string; provider: string; model: string | null; answer_text: string; collected_at: string; review_status: string }>>(
    `run_answers?select=id,run_id,prompt_id,prompt_text,provider,model,answer_text,collected_at,review_status&id=in.(${inFilter(answerIds)})&organization_id=eq.${context.organizationId}&review_status=eq.verified`,
    { token: viewer.accessToken },
  ) : [];
  const baselineRunIds = Array.from(new Set(candidateAnswers.map((row) => row.run_id)));
  const baselineRuns = baselineRunIds.length ? await supabaseRest<RunRow[]>(
    `runs?select=id,status,provider_ids,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at,created_at&id=in.(${inFilter(baselineRunIds)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(review,complete,partial)&order=completed_at.desc.nullslast`,
    { token: viewer.accessToken },
  ) : [];
  const baselineRunId = baselineRuns[0]?.id || null;
  const answers = baselineRunId ? candidateAnswers.filter((row) => row.run_id === baselineRunId) : [];
  const answerById = new Map(answers.map((row) => [row.id, row]));
  const evidence: VerifiedResolutionEvidence[] = observations.flatMap((observation) => {
    const answer = observation.run_answer_id ? answerById.get(observation.run_answer_id) : null;
    if (!answer) return [];
    return [{ id: observation.id, kind: "source_observation", title: problem.sourceTitle || problem.sourceUrl, url: problem.sourceUrl, observedAt: observation.observed_at, provider: answer.provider || observation.provider, model: answer.model, question: answer.prompt_text || null, excerpt: clean(answer.answer_text, 500) || null, runId: answer.run_id, verification: "verified" } as VerifiedResolutionEvidence];
  });
  if (input.evidenceItemIds.length) {
    const items = await supabaseRest<Array<{ id: string; title: string; source_url: string | null; verified_at: string | null; verification_status: string; usage_rights: string | null; expires_at: string | null }>>(
      `evidence_items?select=id,title,source_url,verified_at,verification_status,usage_rights,expires_at&id=in.(${inFilter(input.evidenceItemIds)})&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&verification_status=eq.verified`,
      { token: viewer.accessToken },
    );
    const now = Date.now();
    for (const item of items) {
      if (!item.source_url || !item.usage_rights?.trim() || (item.expires_at && new Date(item.expires_at).getTime() <= now)) continue;
      evidence.push({ id: item.id, kind: "evidence_item", title: item.title, url: item.source_url, observedAt: item.verified_at, provider: null, model: null, question: null, excerpt: null, runId: null, verification: "verified" });
    }
  }
  return { evidence, baselineRunId };
}

async function loadAsset(viewer: Viewer, context: WorkspaceContext, id: string) {
  const rows = await supabaseRest<AssetRow[]>(
    `resolution_assets?select=id,organization_id,project_id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,proposal,limitations,generation_version,customer_edited_at,status,review_decision,created_by,submitted_by,submitted_at,approved_by,approved_at,decision_by,decision_at,approval_note,applied_by,applied_at,application_reference,application_note,created_at,updated_at&id=eq.${id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  return rows[0] || null;
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { resolutions: [] }, mode: "demo" });
  const { context } = await resolveWorkspace(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  try { return NextResponse.json({ data: { resolutions: await loadResolutionRecords(viewer, context) } }); }
  catch (error) { if (isMissingRelationError(error)) return pendingMigrationResponse(); throw error; }
}

async function handleCreate(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Resolution generation is unavailable in the fictional demo." }, { status: 409 });
  const { context, role } = await resolveWorkspace(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!writable(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can create resolution work." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = clean(body.action, 30);

  if (action === "generate") {
    const changeSpecificationId = clean(body.changeSpecificationId, 36);
    const assetType = parseGenerateAssetType(body.assetType);
    if (!uuid.test(changeSpecificationId) || !assetType) return NextResponse.json({ error: "Choose a valid reviewed Change Specification and resolution type." }, { status: 400 });

    const changeSpecification = await loadChangeSpecification(viewer, context, changeSpecificationId);
    if (!changeSpecification) return NextResponse.json({ error: "Change Specification not found in this workspace." }, { status: 404 });
    if (!["in_review", "approved", "in_execution", "completed"].includes(changeSpecification.status)) {
      return NextResponse.json({ error: "Execution assets require a reviewed Change Specification before generation." }, { status: 409 });
    }

    const problem = await findProblem(viewer, context, changeSpecification.primary_opportunity_id);
    if (!problem) return NextResponse.json({ error: "Observed problem not found in this workspace." }, { status: 404 });
    const existingAssets = await supabaseRest<Array<{ id: string }>>(
      `resolution_assets?select=id&opportunity_id=eq.${problem.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    );
    if (existingAssets[0]) {
      const existingLinks = await supabaseRest<ChangeExecutionAssetRow[]>(
        `change_execution_assets?select=change_specification_id&resolution_asset_id=eq.${existingAssets[0].id}&change_specification_id=eq.${changeSpecification.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
        { token: viewer.accessToken },
      );
      if (!existingLinks[0]) return NextResponse.json({ error: "A legacy Resolution Asset already exists for this opportunity. Foremention will not silently reinterpret it as execution of this Change Specification." }, { status: 409 });
      const resolutions = await loadResolutionRecords(viewer, context);
      return NextResponse.json({ data: { resolution: resolutions.find((row) => row.id === existingAssets[0].id) } });
    }

    const { evidence, baselineRunId } = await loadVerifiedEvidence({ viewer, context, problem, evidenceItemIds: uniqueIds(body.evidenceItemIds), sourceObservationIds: uniqueIds(body.sourceObservationIds) });
    if (!evidence.length || !baselineRunId) return NextResponse.json({ error: "Review at least one observation for this source before generating a solution asset." }, { status: 409 });
    const generated = buildResolutionProposal({ type: assetType, problem, evidence });
    let rows: AssetRow[];
    try {
      rows = await supabaseRest<AssetRow[]>("resolution_assets", {
        method: "POST", token: viewer.accessToken, prefer: "return=representation",
        body: { organization_id: context.organizationId, project_id: context.projectId, opportunity_id: problem.id, source_id: problem.sourceId, baseline_run_id: baselineRunId, asset_type: assetType, title: generated.title, problem_statement: generated.problemStatement, proposal: generated.proposal, limitations: generated.limitations, created_by: viewer.id },
      });
    } catch (error) {
      if (!uniqueViolation(error)) throw error;
      const concurrent = await supabaseRest<Array<{ id: string }>>(
        `resolution_assets?select=id&opportunity_id=eq.${problem.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
        { token: viewer.accessToken },
      );
      if (!concurrent[0]) throw error;
      const concurrentLinks = await supabaseRest<ChangeExecutionAssetRow[]>(
        `change_execution_assets?select=change_specification_id&resolution_asset_id=eq.${concurrent[0].id}&change_specification_id=eq.${changeSpecification.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
        { token: viewer.accessToken },
      );
      if (!concurrentLinks[0]) return NextResponse.json({ error: "A Resolution Asset was created concurrently but is not linked to this Change Specification. Retry after reviewing the current decision state." }, { status: 409 });
      const resolutions = await loadResolutionRecords(viewer, context);
      return NextResponse.json({ data: { resolution: resolutions.find((row) => row.id === concurrent[0].id) }, duplicate: true });
    }
    const asset = rows[0];
    if (!asset) return NextResponse.json({ error: "The resolution draft could not be created." }, { status: 503 });
    try {
      await supabaseRest("resolution_asset_evidence", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: evidence.map((entry) => ({ organization_id: context.organizationId, project_id: context.projectId, resolution_asset_id: asset.id, evidence_item_id: entry.kind === "evidence_item" ? entry.id : null, source_observation_id: entry.kind === "source_observation" ? entry.id : null, evidence_snapshot: entry })) });
      await supabaseRest("change_execution_assets", {
        method: "POST", token: viewer.accessToken, prefer: "return=minimal",
        body: { organization_id: context.organizationId, project_id: context.projectId, change_specification_id: changeSpecification.id, resolution_asset_id: asset.id, execution_role: executionRoleFor(asset.asset_type), created_by: viewer.id },
      });
    } catch (error) {
      await supabaseRest(`resolution_assets?id=eq.${asset.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "DELETE", token: viewer.accessToken }).catch(() => undefined);
      throw error;
    }
    await supabaseRest("audit_logs", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { organization_id: context.organizationId, actor_id: viewer.id, action: "resolution.generated", entity_type: "resolution_asset", entity_id: asset.id, after_state: { asset_type: assetType, opportunity_id: problem.id, evidence_count: evidence.length, baseline_run_id: baselineRunId, change_specification_id: changeSpecification.id } } }).catch(() => undefined);
    const resolutions = await loadResolutionRecords(viewer, context);
    return NextResponse.json({ data: { resolution: resolutions.find((row) => row.id === asset.id) } }, { status: 201 });
  }

  if (action === "remeasure") {
    const resolutionId = clean(body.resolutionId, 36);
    const rerunId = clean(body.rerunId, 36);
    const measurementId = clean(body.measurementId, 36);
    if (!uuid.test(resolutionId) || (rerunId && !uuid.test(rerunId)) || (measurementId && !uuid.test(measurementId))) return NextResponse.json({ error: "Choose a valid applied resolution and follow-up run." }, { status: 400 });
    const asset = await loadAsset(viewer, context, resolutionId);
    if (!asset) return NextResponse.json({ error: "Resolution not found." }, { status: 404 });
    if (asset.status !== "applied" || !asset.baseline_run_id) return NextResponse.json({ error: "Apply the approved resolution before requesting a comparable measurement." }, { status: 409 });

    if (!rerunId) {
      const [baseline, selections] = await Promise.all([
        supabaseRest<RunRow[]>(`runs?select=id,status,provider_ids,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at,created_at&id=eq.${asset.baseline_run_id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(review,complete,partial)&limit=1`, { token: viewer.accessToken }),
        supabaseRest<Array<{ prompt_id: string }>>(`run_prompt_selections?select=prompt_id&run_id=eq.${asset.baseline_run_id}&organization_id=eq.${context.organizationId}&order=prompt_id.asc`, { token: viewer.accessToken }),
      ]);
      if (!baseline[0] || baseline[0].provider_ids.length !== 1 || !selections.length) return NextResponse.json({ error: "The baseline is missing one exact provider or its approved buyer questions, so a comparable run cannot be started." }, { status: 409 });
      const existing = await supabaseRest<FollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&resolution_asset_id=eq.${asset.id}&organization_id=eq.${context.organizationId}&status=in.(requested,queued)&order=requested_at.desc&limit=1`, { token: viewer.accessToken });
      let followUp = existing[0];
      if (!followUp) {
        try {
          const created = await supabaseRest<FollowUpRow[]>("resolution_follow_ups", { method: "POST", token: viewer.accessToken, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, resolution_asset_id: asset.id, baseline_run_id: asset.baseline_run_id, requested_by: viewer.id } });
          followUp = created[0];
        } catch (error) {
          if (!uniqueViolation(error)) throw error;
          const concurrent = await supabaseRest<FollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&resolution_asset_id=eq.${asset.id}&organization_id=eq.${context.organizationId}&status=in.(requested,queued)&order=requested_at.desc&limit=1`, { token: viewer.accessToken });
          followUp = concurrent[0];
        }
      }
      if (!followUp) return NextResponse.json({ error: "The follow-up request could not be recorded." }, { status: 503 });
      return NextResponse.json({ data: { measurementRequestId: followUp.id, followUp, runRequest: { measurementId: followUp.id, promptIds: selections.map((row) => row.prompt_id), providers: baseline[0]?.provider_ids || [], idempotencyKey: `resolution:${asset.id}:${followUp.id}` } } }, { status: 202 });
    }

    if (!measurementId) return NextResponse.json({ error: "The durable follow-up request ID is required before a run can be attached." }, { status: 400 });
    const requests = await supabaseRest<FollowUpRow[]>(`resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&${measurementId ? `id=eq.${measurementId}&` : ""}resolution_asset_id=eq.${asset.id}&organization_id=eq.${context.organizationId}&status=in.(requested,queued)&order=requested_at.desc&limit=1`, { token: viewer.accessToken });
    const followUp = requests[0];
    if (!followUp) return NextResponse.json({ error: "Create a follow-up request before attaching the run." }, { status: 409 });
    const [baselineRows, rerunRows, baselineSelections, rerunSelections] = await Promise.all([
      supabaseRest<RunRow[]>(`runs?select=id,status,provider_ids,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at,created_at&id=eq.${asset.baseline_run_id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`, { token: viewer.accessToken }),
      supabaseRest<RunRow[]>(`runs?select=id,status,provider_ids,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at,created_at&id=eq.${rerunId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`, { token: viewer.accessToken }),
      supabaseRest<Array<{ prompt_id: string }>>(`run_prompt_selections?select=prompt_id&run_id=eq.${asset.baseline_run_id}&organization_id=eq.${context.organizationId}&order=prompt_id.asc`, { token: viewer.accessToken }),
      supabaseRest<Array<{ prompt_id: string }>>(`run_prompt_selections?select=prompt_id&run_id=eq.${rerunId}&organization_id=eq.${context.organizationId}&order=prompt_id.asc`, { token: viewer.accessToken }),
    ]);
    const baseline = baselineRows[0]; const rerun = rerunRows[0];
    if (!baseline || !rerun) return NextResponse.json({ error: "The follow-up run does not belong to this workspace." }, { status: 404 });
    if (rerun.id === baseline.id || new Date(rerun.created_at).getTime() < new Date(followUp.requested_at).getTime()) return NextResponse.json({ error: "A comparable follow-up must be a new run created after the resolution measurement was requested." }, { status: 409 });
    const sameProviders = JSON.stringify([...baseline.provider_ids].sort()) === JSON.stringify([...rerun.provider_ids].sort());
    const samePrompts = JSON.stringify(baselineSelections.map((row) => row.prompt_id).sort()) === JSON.stringify(rerunSelections.map((row) => row.prompt_id).sort());
    if (!sameProviders || !samePrompts) return NextResponse.json({ error: "The follow-up must use the same buyer questions and provider as the baseline." }, { status: 409 });
    if (followUp.status === "requested") await supabaseRest(`resolution_follow_ups?id=eq.${followUp.id}&organization_id=eq.${context.organizationId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { rerun_id: rerun.id, status: "queued" } });
    if (["complete", "partial", "failed", "cancelled"].includes(rerun.status)) await finalizeResolutionFollowUpsForRun({ organizationId: context.organizationId, runId: rerun.id, runStatus: rerun.status as "complete" | "partial" | "failed" | "cancelled", recordedBy: viewer.id });
    const resolutions = await loadResolutionRecords(viewer, context);
    return NextResponse.json({ data: { resolution: resolutions.find((row) => row.id === asset.id) } }, { status: 200 });
  }

  return NextResponse.json({ error: "Choose generate or remeasure." }, { status: 400 });
}

async function handleChange(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ error: "Resolution changes are unavailable in the fictional demo." }, { status: 409 });
  const { context, role } = await resolveWorkspace(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  if (!writable(role)) return NextResponse.json({ error: "Only owners, admins, and analysts can change resolution work." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = clean(body.action, 30); const resolutionId = clean(body.resolutionId, 36);
  if (!uuid.test(resolutionId)) return NextResponse.json({ error: "Choose a valid resolution." }, { status: 400 });
  const asset = await loadAsset(viewer, context, resolutionId);
  if (!asset) return NextResponse.json({ error: "Resolution not found." }, { status: 404 });
  const now = new Date().toISOString();
  let update: Record<string, unknown>;

  if (action === "update_draft") {
    if (!(asset.status === "draft" || (asset.status === "in_review" && asset.review_decision === "changes_requested"))) return NextResponse.json({ error: "Only a draft or requested revision can be edited." }, { status: 409 });
    let proposal: Record<string, unknown>;
    let title = asset.title;
    let limitations = asset.limitations;
    let assetType = asset.asset_type;
    if (body.proposal && typeof body.proposal === "object" && !Array.isArray(body.proposal)) proposal = body.proposal as Record<string, unknown>;
    else {
      title = clean(body.title, 200);
      const summary = clean(body.summary, 1200); const content = cleanMultiline(body.content, 20_000); const limitationText = cleanMultiline(body.limitations, 2000);
      assetType = internalAssetType(clean(body.assetType, 40));
      if (!title || !summary || !content || !limitationText) return NextResponse.json({ error: "Complete the title, summary, asset content, and limitations before saving." }, { status: 400 });
      const evidenceIds = Array.from(new Set((Array.isArray(asset.proposal.draftSections) ? asset.proposal.draftSections as Array<Record<string, unknown>> : []).flatMap((section) => Array.isArray(section.evidenceIds) ? section.evidenceIds.filter((id): id is string => typeof id === "string") : [])));
      proposal = { schemaVersion: "1.0", assetType, headline: title, objective: summary, draftSections: [{ heading: "Customer-edited resolution asset", guidance: content, evidenceIds }], evidenceBoundary: clean(asset.proposal.evidenceBoundary, 2000) || "Use only the linked verified evidence; unsupported claims must be removed or marked unknown.", nextStep: clean(asset.proposal.nextStep, 2000) || "Submit this revision for customer approval before applying it.", customerEdited: true };
      limitations = [limitationText];
    }
    if (JSON.stringify(proposal).length > 30_000) return NextResponse.json({ error: "Provide a valid resolution proposal under 30 KB." }, { status: 400 });
    update = { asset_type: assetType, title, proposal: { ...proposal, customerEdited: true }, limitations, customer_edited_by: viewer.id, customer_edited_at: now, ...(asset.status === "in_review" ? { review_decision: "pending", decision_by: null, decision_at: null, approval_note: null } : {}) };
  } else if (action === "decision") {
    const decision = clean(body.decision, 30); const note = clean(body.note, 2000) || null;
    if (!["submit", "approved", "changes_requested", "rejected"].includes(decision)) return NextResponse.json({ error: "Choose submit, approved, changes_requested, or rejected." }, { status: 400 });
    if (decision === "submit") {
      if (asset.status !== "draft") return NextResponse.json({ error: "Only a draft can be submitted for review." }, { status: 409 });
      update = { status: "in_review", review_decision: "pending", submitted_by: viewer.id, submitted_at: now };
    } else {
      if (!manager(role)) return NextResponse.json({ error: "Only an owner or admin can decide a resolution review." }, { status: 403 });
      if (asset.status === "draft") await supabaseRest(`resolution_assets?id=eq.${asset.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: { status: "in_review", review_decision: "pending", submitted_by: viewer.id, submitted_at: now } });
      else if (asset.status !== "in_review") return NextResponse.json({ error: "Only a draft or submitted resolution can receive a review decision." }, { status: 409 });
      update = decision === "approved" ? { status: "approved", review_decision: "approved", approved_by: viewer.id, approved_at: now, decision_by: viewer.id, decision_at: now, approval_note: note } : { review_decision: decision, decision_by: viewer.id, decision_at: now, approval_note: note };
    }
  } else if (action === "mark_applied") {
    if (!manager(role)) return NextResponse.json({ error: "Only an owner or admin can mark an approved resolution applied." }, { status: 403 });
    if (asset.status !== "approved" && asset.status !== "applied") return NextResponse.json({ error: "Approve the resolution before recording its application." }, { status: 409 });
    const links = await supabaseRest<ChangeExecutionAssetRow[]>(
      `change_execution_assets?select=change_specification_id&resolution_asset_id=eq.${asset.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    );
    const linkedChangeSpecificationId = links[0]?.change_specification_id || null;
    if (linkedChangeSpecificationId) {
      const linked = await loadChangeSpecification(viewer, context, linkedChangeSpecificationId);
      if (!linked || !["approved", "in_execution", "completed"].includes(linked.status)) return NextResponse.json({ error: "Approve the linked Change Specification before recording execution." }, { status: 409 });
    }
    const reference = clean(body.reference || body.targetUrl, 1000);
    const note = clean(body.note, 2000) || null;
    if (!reference) return NextResponse.json({ error: "Record the customer-controlled page, pull request, document, ticket, release, policy, or other reference where the approved execution asset was applied." }, { status: 400 });
    update = { status: "applied", applied_by: viewer.id, applied_at: now, application_reference: reference, application_note: note };
  } else return NextResponse.json({ error: "Choose update_draft, decision, or mark_applied." }, { status: 400 });

  await supabaseRest(`resolution_assets?id=eq.${asset.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=minimal", body: update });
  await supabaseRest("audit_logs", { method: "POST", token: viewer.accessToken, prefer: "return=minimal", body: { organization_id: context.organizationId, actor_id: viewer.id, action: `resolution.${action}`, entity_type: "resolution_asset", entity_id: asset.id, before_state: { status: asset.status, decision: asset.review_decision }, after_state: { action, ...update } } }).catch(() => undefined);
  const resolutions = await loadResolutionRecords(viewer, context);
  return NextResponse.json({ data: { resolution: resolutions.find((row) => row.id === asset.id) } });
}

async function withPendingMigrationGuard(run: () => Promise<Response>) {
  try { return await run(); }
  catch (error) { if (isMissingRelationError(error)) return pendingMigrationResponse(); throw error; }
}

export async function POST(request: Request) { return withPendingMigrationGuard(() => handleCreate(request)); }
export async function PATCH(request: Request) { return withPendingMigrationGuard(() => handleChange(request)); }
