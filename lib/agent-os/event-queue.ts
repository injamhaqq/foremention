import { operatingAgentOsEnabled } from "@/lib/agent-os/config";
import { inngest } from "@/lib/jobs/inngest";

export async function queueReviewedRunOperatingAgents(input: {
  runId: string;
  organizationId: string;
  projectId: string;
  reviewedBy: string;
  status: "complete" | "partial";
}) {
  if (!operatingAgentOsEnabled() || !process.env.INNGEST_EVENT_KEY) return { queued: false };
  await inngest.send({
    id: `agent-os-reviewed-run-${input.runId}`,
    name: "foremention/run.reviewed",
    data: input,
  });
  return { queued: true };
}


export async function queueSupportTicketOperatingAgent(input: {
  ticketId: string;
  organizationId: string;
  projectId: string;
  requestedBy: string;
}) {
  if (!operatingAgentOsEnabled() || !process.env.INNGEST_EVENT_KEY) return { queued: false };
  await inngest.send({
    id: `agent-os-support-ticket-${input.ticketId}`,
    name: "foremention/support.requested",
    data: input,
  });
  return { queued: true };
}
