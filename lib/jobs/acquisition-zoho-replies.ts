import { pollZohoAcquisitionReplies } from "@/lib/acquisition-zoho-reply-runtime";
import { inngest } from "@/lib/jobs/inngest";

export const pollZohoAcquisitionRepliesJob = inngest.createFunction(
  {
    id: "poll-acquisition-zoho-replies",
    retries: 1,
    triggers: { cron: "*/15 * * * *" },
  },
  async ({ step }) => step.run("poll-zoho-acquisition-replies", () => pollZohoAcquisitionReplies()),
);
