import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { assessLaterCycle } from "@/lib/customer-value-loop";
import { runRowToLoop, type LoopAnswerRow, type LoopRunRow } from "@/lib/customer-value-loop-snapshot";
import { buildPortableDecisionReviewMarkdown, type ReportCollection, type ReportEvidence, type ReportDecision } from "@/lib/decision-review-report";
import { assessWorkspaceRunPairComparability } from "@/lib/run-pair-comparability";
import { RECORD_DECISION_COLUMNS, type RecordDecisionRow } from "@/lib/record-decisions";
import { supabaseRest } from "@/lib/supabase-rest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWERS = 200;
const deny = (error: string, status: number) => Response.json({ error }, {
  status, headers: { "cache-control": "no-store" },
});

type RunRow = LoopRunRow & { completed_at: string | null };
type AnswerRow = LoopAnswerRow & { id: string; collected_at: string; brand_present: boolean | null };
type Specification = {
  id: string; organization_id: string; project_id: string; baseline_run_id: string | null;
  status: string; owner_role: string | null; exact_change: string | null;
  acceptance_criteria_json: string[] | null; verification_plan_json: Record<string, unknown> | null;
};
type EvidenceLink = { source_observation_id: string | null; evidence_item_id: string | null; evidence_snapshot: Record<string, unknown> };
type SourceObservation = { id: string; run_answer_id: string | null; review_status: string };
type SourceLink = { source_observation_id: string; source_snapshot_id: string };
type Snapshot = { id: string; run_id: string | null; access: string; retrieved_at: string };

const joined = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((x): x is string => typeof x === "string" && Boolean(x.trim())))].join(", ") || "unknown";
const date = (answers: AnswerRow[], fallback: string) =>
  answers.map((x) => x.collected_at).filter((x) => Number.isFinite(Date.parse(x))).sort()[0] || fallback;
const collection = (run: RunRow, answers: AnswerRow[], org: string, project: string): ReportCollection => ({
  id: run.id, organizationId: org, projectId: project,
  collectedAt: date(answers, run.completed_at || run.created_at),
  provider: joined(answers.map((x) => x.provider)),
  model: joined(answers.map((x) => x.model)),
  method: joined(answers.map((x) => x.observation_method)),
  reviewedAnswers: answers.filter((x) => x.review_status === "verified").length,
  totalAnswers: answers.length,
});
const readList = async <T,>(url: string, token: string) => supabaseRest<T[]>(url, { token });

/**
 * Private, authenticated active-project download only — not a share link.
 * Unlike the generic export/share surface, this endpoint refuses viewer role,
 * demo fixtures, missing Record or decision IDs, unqualified approved actions,
 * and unverified later comparisons. No client-supplied organization or actor.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return deny("Sign in to export a reviewed decision.", 401);
  if (viewer.mode === "demo") return deny("Fictional demo decisions cannot be exported as customer records.", 409);
  if (!viewer.accessToken) return deny("Sign in again to export a reviewed decision.", 401);
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!["owner", "admin", "analyst"].includes(role || "")) return deny("Only authorized workspace reviewers can export decision packets.", 403);
  const context = await loadWorkspaceContext(viewer);
  if (!context) return deny("Active workspace unavailable.", 404);
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const decisionId = search.get("decisionId") || "";
  const laterRunId = search.get("laterRunId");
  if (!UUID.test(id) || !UUID.test(decisionId) || (laterRunId && !UUID.test(laterRunId)))
    return deny("A valid Record and decision ID are required.", 400);

  const org = encodeURIComponent(context.organizationId), project = encodeURIComponent(context.projectId);
  const token = viewer.accessToken;
  try {
    const [runs, decisions, answers] = await Promise.all([
      readList<RunRow>(`runs?select=id,organization_id,project_id,status,created_at,completed_at,methodology_version,question_set_version,cycle_origin&id=eq.${id}&organization_id=eq.${org}&project_id=eq.${project}&limit=1`, token),
      readList<RecordDecisionRow>(`record_decisions?select=${RECORD_DECISION_COLUMNS}&id=eq.${decisionId}&baseline_run_id=eq.${id}&organization_id=eq.${org}&project_id=eq.${project}&limit=1`, token),
      readList<AnswerRow>(`run_answers?select=id,run_id,organization_id,prompt_key,prompt_text,provider,model,review_status,observation_method,sampling_json,measurement_context_json,brand_present,collected_at&run_id=eq.${id}&organization_id=eq.${org}&order=collected_at.asc&limit=${MAX_ANSWERS+1}`, token),
    ]);
    const baseline = runs[0], recordDecision = decisions[0];
    if (!baseline || !recordDecision) return deny("Scoped reviewed Record or saved decision not found.", 404);
    if (!["review", "complete", "partial"].includes(baseline.status))
      return deny("The baseline Record has not entered human review.", 409);
    if (!answers.length || answers.length > MAX_ANSWERS || answers.some((x) => !x.prompt_text || !x.provider))
      return deny("Baseline review/provenance is missing or exceeds the reporting evidence budget.", 409);

    let spec: Specification | null = null;
    let evidenceLinks: EvidenceLink[] = [];
    if (recordDecision.change_specification_id) {
      const specs = await readList<Specification>(
        `change_specifications?select=id,organization_id,project_id,baseline_run_id,status,owner_role,exact_change,acceptance_criteria_json,verification_plan_json&id=eq.${recordDecision.change_specification_id}&organization_id=eq.${org}&project_id=eq.${project}&limit=1`, token);
      spec = specs[0] || null;
      if (!spec || (spec.baseline_run_id && spec.baseline_run_id !== id))
        return deny("Canonical Change Specification is unavailable or refers to a different Record.", 409);
      evidenceLinks = await readList<EvidenceLink>(
        `change_specification_evidence?select=source_observation_id,evidence_item_id,evidence_snapshot&change_specification_id=eq.${spec.id}&organization_id=eq.${org}&project_id=eq.${project}&limit=100`, token);
    }
    const isApproved = Boolean(recordDecision.approved_by && recordDecision.approved_at);
    if (recordDecision.decision_kind === "change_specification" && isApproved &&
        (!spec || !["approved", "in_execution", "completed"].includes(spec.status)))
      return deny("Record decision approval has not been reconciled with the canonical Change Specification.", 409);

    // Source snapshots are linked by explicit immutable observation IDs. Unknown
    // and inaccessible sources stay unknown/blocked; never assume source support.
    const obsIds = evidenceLinks.map((x) => x.source_observation_id).filter((x): x is string => Boolean(x) && UUID.test(x));
    const sourceObs = obsIds.length ? await readList<SourceObservation>(
      `source_observations?select=id,run_answer_id,review_status&id=in.(${obsIds.join(",")})&organization_id=eq.${org}&limit=100`, token) : [];
    const sourceById = new Map(sourceObs.map((x) => [x.id, x]));
    const sourceEdges = obsIds.length ? await readList<SourceLink>(
      `source_snapshot_observations?select=source_observation_id,source_snapshot_id&source_observation_id=in.(${obsIds.join(",")})&limit=300`, token) : [];
    const snapshotIds = [...new Set(sourceEdges.map((x) => x.source_snapshot_id).filter((x) => UUID.test(x)))];
    const snaps = snapshotIds.length ? await readList<Snapshot>(
      `source_snapshots?select=id,run_id,access,retrieved_at&id=in.(${snapshotIds.join(",")})&organization_id=eq.${org}&limit=300`, token) : [];
    const snapshotById = new Map(snaps.filter((x) => x.run_id === id &&
      Number.isFinite(Date.parse(x.retrieved_at)) && Date.parse(x.retrieved_at) <= Date.parse(recordDecision.decided_at))
      .map((x) => [x.id, x]));
    const answerIds = new Set(answers.filter((x) => x.review_status === "verified").map((x) => x.id));
    const evidence: ReportEvidence[] = evidenceLinks.map((link) => {
      const idValue = link.source_observation_id || link.evidence_item_id || "";
      const observation = link.source_observation_id ? sourceById.get(link.source_observation_id) : null;
      const matching = sourceEdges.filter((x) => x.source_observation_id === idValue)
        .map((x) => snapshotById.get(x.source_snapshot_id))
        .filter((x): x is Snapshot => Boolean(x)).sort((a, b) => b.retrieved_at.localeCompare(a.retrieved_at))[0];
      return {
        id: idValue, runId: observation ? (answerIds.has(observation.run_answer_id || "") ? id : "not-this-Record") : null,
        reviewStatus: observation?.review_status === "verified" && answerIds.has(observation.run_answer_id || "") ? "verified" :
          (!observation && link.evidence_snapshot?.verification === "verified" ? "verified" : "unreviewed"),
        accessStatus: matching && ["open", "partial", "blocked"].includes(matching.access) ?
          matching.access as "open" | "partial" | "blocked" : "unknown",
        origin: matching ? "independent_retrieval" : "unknown",
      };
    });

    const decision: ReportDecision = {
      id: recordDecision.id, organizationId: context.organizationId, projectId: context.projectId, baselineRunId: id,
      kind: recordDecision.decision_kind,
      disposition: recordDecision.decision_kind === "reviewer_disagreement" ? "disagreement" :
        recordDecision.decision_kind === "no_action" ?
          (recordDecision.decision_state === "MONITOR_ONLY" ? "deferred" : "no_change") :
          isApproved ? "approved" : spec?.status === "rejected" ? "rejected" : "pending_review",
      evidenceIds: evidence.filter((x) => x.reviewStatus === "verified" && ["open", "partial"].includes(x.accessStatus)).map((x) => x.id),
      decidedAt: recordDecision.decided_at,
      reviewerRole: "role at decision not recorded",
      rationale: recordDecision.rationale,
      changeSpecificationId: spec?.id || null,
      ownerRole: recordDecision.owner_role || spec?.owner_role || null,
      action: recordDecision.action_summary || spec?.exact_change || null,
      dueDate: recordDecision.due_date,
      successCriteria: spec?.acceptance_criteria_json?.join("; ") || null,
      reversalCriteria: typeof spec?.verification_plan_json?.reversalCriteria === "string" ?
        spec.verification_plan_json.reversalCriteria : null,
    };
    const questions = [...new Set(answers.map((x) => x.prompt_text || "").filter(Boolean))];
    if (questions.length > 20) return deny("Decision packet supports at most 20 distinct buyer questions.", 409);
    const reportBaseline = collection(baseline, answers, context.organizationId, context.projectId);

    let followUp = null;
    if (laterRunId) {
      const [laterRuns, laterAnswers] = await Promise.all([
        readList<RunRow>(`runs?select=id,organization_id,project_id,status,created_at,completed_at,methodology_version,question_set_version,cycle_origin&id=eq.${laterRunId}&organization_id=eq.${org}&project_id=eq.${project}&limit=1`, token),
        readList<AnswerRow>(`run_answers?select=id,run_id,organization_id,prompt_key,prompt_text,provider,model,review_status,observation_method,sampling_json,measurement_context_json,brand_present,collected_at&run_id=eq.${laterRunId}&organization_id=eq.${org}&limit=${MAX_ANSWERS+1}`, token),
      ]);
      const later = laterRuns[0];
      if (!later || !laterAnswers.length || laterAnswers.length > MAX_ANSWERS)
        return deny("A later Record with readable bounded observations was not found in this project.", 404);
      const domain = assessLaterCycle(runRowToLoop(baseline, answers), runRowToLoop(later, laterAnswers));
      const canonical = await assessWorkspaceRunPairComparability(viewer, id, laterRunId);
      const eligible = domain.status === "comparable" && canonical.comparable;
      const reasons = [...new Set([
        ...(domain.status === "not_comparable" ? domain.reasons : []),
        ...(!canonical.comparable ? [canonical.reason || "Exact comparison proof unavailable"] : []),
      ])];
      const basic = collection(later, laterAnswers, context.organizationId, context.projectId);
      const first = canonical.answers.filter((x) => x.runId === id);
      const second = canonical.answers.filter((x) => x.runId === laterRunId);
      const complete = eligible && first.length === answers.length && second.length === laterAnswers.length &&
        [...first, ...second].every((x) => typeof x.brandPresent === "boolean");
      followUp = {
        ...basic, comparison: { eligible: complete, reasons: complete ? [] : [...reasons, "Full exact count/brand-presence provenance not verified"] },
        observation: complete ? {
          label: "Observed brand presence",
          baselineCount: first.filter((x) => x.brandPresent).length,
          laterCount: second.filter((x) => x.brandPresent).length,
          baselineTotal: answers.length, laterTotal: laterAnswers.length,
        } : undefined,
        customerReportedOutcome: null,
      };
    }

    // Customer-vs-internal status is not inferred from auth or cycle_origin.
    const md = buildPortableDecisionReviewMarkdown({
      origin: "workspace_unverified", generatedAt: new Date().toISOString(),
      organizationId: context.organizationId, projectId: context.projectId,
      brand: context.projectBrand || "Brand unknown",
      questions, baseline: reportBaseline, decision, evidence, followUp,
    });
    return new Response(md, { headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="foremention-decision-${id.slice(0, 8)}.md"`,
      "cache-control": "private, no-store", "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    } });
  } catch (error) {
    // No data, stack traces or internal source URLs in outward errors.
    if (error instanceof Error && error.message.startsWith("Decision report unavailable:"))
      return deny(error.message, 409);
    console.error("Decision report preparation failed.", error instanceof Error ? error.message : "unknown");
    return deny("Could not verify the complete decision packet. Nothing was exported.", 503);
  }
}
