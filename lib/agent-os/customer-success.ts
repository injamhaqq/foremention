import { proposeAgentAction } from "@/lib/agent-os/actions";
import { runCustomerSuccessDraftReasoner } from "@/lib/agent-os/customer-success-draft";
import { placementBelongsToProject } from "@/lib/agent-os/customer-success-core";
import { deriveActivationStage } from "@/lib/retention-loop";
import { deriveRetentionHealth } from "@/lib/retention-health";
import { supabaseRest } from "@/lib/supabase-rest";

export async function runCustomerSuccessAgent(input: {
  runId: string;
  organizationId: string;
  projectId: string;
}) {
  const [prompts, organizationPlacements, schedules, projectRuns] = await Promise.all([
    supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${encodeURIComponent(input.organizationId)}&project_id=eq.${encodeURIComponent(input.projectId)}&active=eq.true&limit=100`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{
      id: string;
      owner_id: string | null;
      due_at: string | null;
      remeasurement_due_at: string | null;
      target_prompt_ids: string[] | null;
      baseline_run_id: string | null;
      remeasurement_run_id: string | null;
    }>>(
      `placements?select=id,owner_id,due_at,remeasurement_due_at,target_prompt_ids,baseline_run_id,remeasurement_run_id&organization_id=eq.${encodeURIComponent(input.organizationId)}&order=created_at.asc&limit=1000`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{ id: string }>>(
      `measurement_schedules?select=id&organization_id=eq.${encodeURIComponent(input.organizationId)}&project_id=eq.${encodeURIComponent(input.projectId)}&enabled=eq.true&limit=1`,
      { serviceRole: true },
    ).catch(() => []),
    supabaseRest<Array<{ id: string }>>(
      `runs?select=id&organization_id=eq.${encodeURIComponent(input.organizationId)}&project_id=eq.${encodeURIComponent(input.projectId)}&order=created_at.desc&limit=1000`,
      { serviceRole: true },
    ),
  ]);

  // placements is intentionally organization-scoped in the database. Derive
  // project membership only from durable project-owned prompt/run links; an
  // unlinked placement is excluded rather than guessed into this project.
  const projectPromptIds = new Set(prompts.map((item) => item.id));
  const projectRunIds = new Set(projectRuns.map((item) => item.id));
  const placements = organizationPlacements.filter((item) =>
    placementBelongsToProject(item, projectPromptIds, projectRunIds));

  const firstActionCreated = placements.length > 0;
  const firstActionAssigned = placements.some((item) => Boolean(item.owner_id));
  const overdueActionCount = placements.filter((item) => {
    const raw = item.remeasurement_due_at || item.due_at;
    if (!raw) return false;
    const at = new Date(raw).getTime();
    return Number.isFinite(at) && at < Date.now();
  }).length;
  const activated = prompts.length >= 5 && firstActionCreated && firstActionAssigned;

  // This trigger proves one human-reviewed collection. Exact second-cycle
  // comparability is intentionally not inferred here; the existing intelligence
  // layer remains authoritative for that determination.
  const activation = deriveActivationStage({
    workspaceConfigured: true,
    approvedQuestions: prompts.length,
    firstCollectionCompleted: true,
    firstRecordReviewed: true,
    firstActionCreated,
    firstActionAssigned,
    comparableReviewedCycles: 1,
  });
  const retentionHealth = deriveRetentionHealth({
    activated,
    secondComparableCycleCompleted: false,
    scheduleEnabled: schedules.length > 0,
    overdueActionCount,
  });

  const action = await proposeAgentAction({
    organizationId: input.organizationId,
    projectId: input.projectId,
    runId: input.runId,
    agentId: "customer-success",
    actionType: "customer_success_attention",
    effectClass: "internal_write",
    riskLevel: "low",
    title: activation.title,
    rationale: `${activation.detail} Current retention state: ${retentionHealth.label}. ${retentionHealth.reason}`,
    evidence: [
      { type: "run", id: input.runId, href: `/app/runs/${input.runId}`, note: "Latest human-reviewed collection." },
      { type: "placement", href: activation.href, note: "Next step comes from Foremention’s existing transparent activation state machine." },
    ],
    payload: {
      activationStage: activation.key,
      activationHref: activation.href,
      retentionStatus: retentionHealth.status,
      approvedQuestionCount: prompts.length,
      firstActionCreated,
      firstActionAssigned,
      scheduleEnabled: schedules.length > 0,
      overdueActionCount,
    },
    confidence: null,
    estimatedCostUsd: 0,
    idempotencyKey: `customer-success:reviewed-run:${input.runId}:v1`,
  });
  const draft = await runCustomerSuccessDraftReasoner({
    runId: input.runId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    activationStage: activation.key,
    activationTitle: activation.title,
    activationDetail: activation.detail,
    activationHref: activation.href,
    retentionStatus: retentionHealth.status,
    retentionLabel: retentionHealth.label,
    retentionReason: retentionHealth.reason,
    approvedQuestionCount: prompts.length,
    firstActionCreated,
    firstActionAssigned,
    scheduleEnabled: schedules.length > 0,
    overdueActionCount,
  }).catch((error) => {
    console.warn("Customer Success reasoning unavailable.", error instanceof Error ? error.message : String(error));
    return { skipped: true as const, reason: "reasoning_failed" };
  });

  return {
    action,
    activation,
    retentionHealth,
    draftActionId: "action" in draft ? draft.action.id : null,
    draft,
  };
}
