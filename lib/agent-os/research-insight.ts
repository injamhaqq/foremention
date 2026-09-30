import { proposeAgentAction } from "@/lib/agent-os/actions";
import {
  MAX_RESEARCH_REASONING_ANSWERS,
  assessResearchReasoningAnswerSet,
  runResearchInsightReasoner,
} from "@/lib/agent-os/research-reasoning";
import { supabaseRest } from "@/lib/supabase-rest";

type ReviewedRunRow = {
  id: string;
  organization_id: string;
  project_id: string;
  status: "complete" | "partial";
  answer_count: number;
  citation_count: number;
  new_source_count: number;
  brand_presence_pct: number | string;
  first_mention_pct: number | string;
};

export async function runResearchInsightAgent(input: {
  runId: string;
  organizationId: string;
  projectId: string;
}) {
  const rows = await supabaseRest<ReviewedRunRow[]>(
    `runs?select=id,organization_id,project_id,status,answer_count,citation_count,new_source_count,brand_presence_pct,first_mention_pct&id=eq.${encodeURIComponent(input.runId)}&organization_id=eq.${encodeURIComponent(input.organizationId)}&project_id=eq.${encodeURIComponent(input.projectId)}&status=in.(complete,partial)&limit=1`,
    { serviceRole: true },
  );
  const run = rows[0];
  if (!run) return { skipped: true, reason: "reviewed_terminal_run_not_found" } as const;
  if (!Number.isSafeInteger(Number(run.answer_count)) || Number(run.answer_count) <= 0) {
    return { skipped: true, reason: "invalid_recorded_answer_count" } as const;
  }
  if (Number(run.answer_count) > MAX_RESEARCH_REASONING_ANSWERS) {
    return { skipped: true, reason: "recorded_answer_set_exceeds_reasoning_packet" } as const;
  }

  // The zero-cost "reviewed evidence ready" action is itself a customer-facing
  // operational truth signal. Reconcile the full verified answer-row set
  // independently before creating it; the reasoner repeats this gate later to
  // defend against a non-atomic second read.
  const verifiedAnswerRows = await supabaseRest<Array<{ id: string; run_id: string; prompt_key: string; provider: string }>>(
    `run_answers?select=id,run_id,prompt_key,provider&organization_id=eq.${encodeURIComponent(run.organization_id)}&run_id=eq.${encodeURIComponent(run.id)}&review_status=eq.verified&order=collected_at.asc&limit=25`,
    { serviceRole: true },
  );
  const evidenceGate = assessResearchReasoningAnswerSet(run, verifiedAnswerRows);
  if (!evidenceGate.ok) return { skipped: true, reason: evidenceGate.reason } as const;

  const title = `Reviewed evidence ready · ${run.answer_count} answer${run.answer_count === 1 ? "" : "s"} · ${run.citation_count} citation${run.citation_count === 1 ? "" : "s"}`;
  const action = await proposeAgentAction({
    organizationId: run.organization_id,
    projectId: run.project_id,
    runId: run.id,
    agentId: "research-insight",
    actionType: "reviewed_evidence_ready",
    effectClass: "observe",
    riskLevel: "low",
    title,
    rationale: "A complete independently reconciled human-verified answer-row set is now available for bounded decision analysis. This record reports persisted observations only; it does not establish citation relevance, factual correctness, causality, buyer intent, or a guaranteed intervention outcome.",
    evidence: [
      { type: "run", id: run.id, href: `/app/runs/${run.id}`, note: "Terminal collection with the full recorded verified answer-row set independently reconciled." },
      { type: "source_map", href: "/app/source-map", note: "Use reviewed source records before promoting a gap into an action." },
    ],
    payload: {
      answerCount: run.answer_count,
      citationCount: run.citation_count,
      newSourceCount: run.new_source_count,
      brandPresencePct: Number(run.brand_presence_pct),
      firstMentionPct: Number(run.first_mention_pct),
      runStatus: run.status,
      nextReviewHref: "/app/intelligence",
    },
    confidence: null,
    estimatedCostUsd: 0,
    idempotencyKey: `research-insight:reviewed-run:${run.id}:v2`,
  });
  const reasoning = await runResearchInsightReasoner({
    runId: run.id,
    organizationId: run.organization_id,
    projectId: run.project_id,
  }).catch((error) => {
    console.warn("Research / Insight reasoning unavailable.", error instanceof Error ? error.message : String(error));
    return { skipped: true as const, reason: "reasoning_failed" };
  });
  return {
    skipped: false,
    action,
    reasoningActionId: "action" in reasoning ? reasoning.action.id : null,
    reasoning,
  } as const;
}
