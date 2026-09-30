import { proposeAgentAction } from "@/lib/agent-os/actions";
import { presentLegacyCeoScorecard } from "@/lib/ceo-acquisition-metric-truth";
import { supabaseRest } from "@/lib/supabase-rest";

type Scorecard = Record<string, string | number | boolean | null>;

export async function runCeoBriefAgent(dateKey = new Date().toISOString().slice(0, 10)) {
  const [companyRows, customerRows, pendingApprovals, failedRuns] = await Promise.all([
    supabaseRest<Scorecard[]>("company_ceo_scorecard?select=*&limit=1", { serviceRole: true }),
    supabaseRest<Scorecard[]>("company_customer_value_scorecard?select=*&limit=1", { serviceRole: true }),
    supabaseRest<Array<{ id: string; agent_id: string; title: string; risk_level: string; created_at: string }>>(
      "agent_actions?select=id,agent_id,title,risk_level,created_at&status=eq.pending_approval&order=created_at.asc&limit=100",
      { serviceRole: true },
    ),
    supabaseRest<Array<{ id: string; organization_id: string; error_summary: string | null; completed_at: string | null }>>(
      `runs?select=id,organization_id,error_summary,completed_at&status=eq.failed&created_at=gte.${encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString())}&order=created_at.desc&limit=100`,
      { serviceRole: true },
    ),
  ]);

  const { company, commercialQualificationEvidence } = presentLegacyCeoScorecard(companyRows[0] || {});
  const customerValue = customerRows[0] || {};
  const action = await proposeAgentAction({
    organizationId: null,
    projectId: null,
    runId: null,
    agentId: "ceo",
    actionType: "daily_ceo_brief",
    effectClass: "observe",
    riskLevel: "low",
    title: `Foremention CEO brief · ${dateKey}`,
    rationale: "Compiled from first-party company/customer-value scorecards, the operating-agent approval queue, and recorded run failures. Missing or insufficient values remain missing; the legacy account qualification flag remains operator triage only. Contact verification, real conversations, buyer qualification, customer status, revenue and causal outcomes must never be inferred from an internal status label.",
    evidence: [
      { type: "scorecard", id: "company_ceo_scorecard", note: "Legacy internal commercial status aggregate: flagged accounts are NOT independently contact-verified, sales-qualified or interviewed." },
      { type: "scorecard", id: "company_customer_value_scorecard", note: "KPI-eligible customer-value aggregate." },
    ],
    payload: {
      dateKey,
      company,
      commercialQualificationEvidence,
      customerValue,
      pendingApprovalCount: pendingApprovals.length,
      pendingApprovals,
      failedRunsLast24h: failedRuns.length,
      failedRuns,
    },
    confidence: null,
    estimatedCostUsd: 0,
    idempotencyKey: `ceo:daily-brief:${dateKey}:metric-truth-v2`,
  });
  return { action, company, commercialQualificationEvidence, customerValue, pendingApprovals, failedRuns };
}
