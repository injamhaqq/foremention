import { serve } from "inngest/next";
import { cleanupCancelledCollection, deliverWorkspaceWebhookEvents, inngest, runMultiEngineScan, scheduleWeeklyWorkspaceRuns } from "@/lib/jobs/inngest";
export const { GET, POST, PUT } = serve({ client: inngest, functions: [runMultiEngineScan, cleanupCancelledCollection, scheduleWeeklyWorkspaceRuns, deliverWorkspaceWebhookEvents] });
