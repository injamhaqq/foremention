import { runZohoAcquisitionCanary } from "@/lib/acquisition-zoho-canary";
import { pollZohoAcquisitionReplies } from "@/lib/acquisition-zoho-reply-runtime";
import { inngest } from "@/lib/jobs/inngest";

export const pollZohoAcquisitionRepliesJob = inngest.createFunction(
  {
    id: "poll-acquisition-zoho-replies",
    retries: 1,
    triggers: { cron: "*/15 * * * *" },
  },
  async ({ step }) => {
    const canary = await step.run("ensure-zoho-acquisition-canary", () => runZohoAcquisitionCanary());
    const replies = await step.run("poll-zoho-acquisition-replies", () => pollZohoAcquisitionReplies());
    return { canary, replies };
  },
);
