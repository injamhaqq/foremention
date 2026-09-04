import { serve } from "inngest/next";
import { cleanupCancelledCollection, deliverHubSpotActionEvents, deliverWorkspaceWebhookEvents, inngest, runMultiEngineScan, scheduleWeeklyWorkspaceRuns } from "@/lib/jobs/inngest";
import { discoverAcquisitionTargets, runRequestedAcquisitionShadow } from "@/lib/jobs/acquisition-discovery";
import { dispatchMeasurementSchedules } from "@/lib/jobs/measurement-schedule-dispatcher";
import { runtimeServiceProbe } from "@/lib/jobs/runtime-probe";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runMultiEngineScan, cleanupCancelledCollection, scheduleWeeklyWorkspaceRuns, discoverAcquisitionTargets, runRequestedAcquisitionShadow, dispatchMeasurementSchedules, runtimeServiceProbe, deliverWorkspaceWebhookEvents, deliverHubSpotActionEvents],
});
