import { operatingAgentOsEnabled } from "@/lib/agent-os/config";
import { runCeoBriefAgent } from "@/lib/agent-os/ceo";
import { runCustomerSuccessAgent } from "@/lib/agent-os/customer-success";
import { runResearchInsightAgent } from "@/lib/agent-os/research-insight";
import { inngest } from "@/lib/jobs/inngest";

type ReviewedRunEvent = {
  runId: string;
  organizationId: string;
  projectId: string;
  reviewedBy: string;
  status: "complete" | "partial";
};

export const runReviewedOperatingAgents = inngest.createFunction(
  {
    id: "run-reviewed-operating-agents",
    retries: 2,
    triggers: { event: "foremention/run.reviewed" },
  },
  async ({ event, step }) => {
    if (!operatingAgentOsEnabled()) return { skipped: true, reason: "agent_os_disabled" };
    const data = event.data as ReviewedRunEvent;
    if (!data.runId || !data.organizationId || !data.projectId) {
      return { skipped: true, reason: "invalid_event" };
    }
    const research = await step.run("research-insight-agent", () => runResearchInsightAgent(data));
    const customerSuccess = await step.run("customer-success-agent", () => runCustomerSuccessAgent(data));
    return {
      skipped: false,
      runId: data.runId,
      researchActionId: research.skipped ? null : research.action.id,
      researchReasoningActionId: research.skipped ? null : research.reasoningActionId,
      customerSuccessActionId: customerSuccess.action.id,
      customerSuccessDraftActionId: customerSuccess.draftActionId,
    };
  },
);

export const generateDailyCeoAgentBrief = inngest.createFunction(
  {
    id: "generate-daily-ceo-agent-brief",
    retries: 2,
    // Inngest cron is UTC. 02:00 UTC is 08:00 in Bangladesh.
    triggers: { cron: "0 2 * * *" },
  },
  async ({ step }) => {
    if (!operatingAgentOsEnabled()) return { skipped: true, reason: "agent_os_disabled" };
    const dateKey = new Date().toISOString().slice(0, 10);
    return step.run("build-ceo-brief", () => runCeoBriefAgent(dateKey));
  },
);
