import { serve } from "inngest/next";
import { cleanupCancelledCollection, deliverHubSpotActionEvents, deliverWorkspaceWebhookEvents, inngest, runMultiEngineScan, scheduleWeeklyWorkspaceRuns } from "@/lib/jobs/inngest";
import { discoverAcquisitionTargets } from "@/lib/jobs/acquisition-discovery";
import { pollZohoAcquisitionRepliesJob } from "@/lib/jobs/acquisition-zoho-replies";
import { dispatchMeasurementSchedules } from "@/lib/jobs/measurement-schedule-dispatcher";
import { runtimeServiceProbe } from "@/lib/jobs/runtime-probe";
import { generateDailyCeoAgentBrief, runReviewedOperatingAgents, runSupportTicketAgent } from "@/lib/jobs/agent-os";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runMultiEngineScan, cleanupCancelledCollection, scheduleWeeklyWorkspaceRuns, discoverAcquisitionTargets, pollZohoAcquisitionRepliesJob, dispatchMeasurementSchedules, runtimeServiceProbe, runReviewedOperatingAgents, runSupportTicketAgent, generateDailyCeoAgentBrief, deliverWorkspaceWebhookEvents, deliverHubSpotActionEvents],
});
