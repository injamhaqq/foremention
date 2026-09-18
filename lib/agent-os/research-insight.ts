import { proposeAgentAction } from "@/lib/agent-os/actions";
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
    rationale: "A human-reviewed collection is now available for decision analysis. This record reports persisted observations only; it does not infer causality, buyer intent, or a guaranteed intervention outcome.",
    evidence: [
      { type: "run", id: run.id, href: `/app/runs/${run.id}`, note: "Human-reviewed terminal collection." },
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
    idempotencyKey: `research-insight:reviewed-run:${run.id}:v1`,
  });
  return { skipped: false, action } as const;
}
