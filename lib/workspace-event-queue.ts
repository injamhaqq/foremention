import { inngest } from "@/lib/jobs/inngest";
import type { DeliveryEvent } from "@/lib/workspace-webhooks";

export async function queueWorkspaceWebhook(event: DeliveryEvent) {
  if (!process.env.INNGEST_EVENT_KEY || !process.env.WEBHOOK_SIGNING_SECRET) return { queued: false };
  await inngest.send({ id: `webhook-${event.eventKey}`, name: "foremention/workspace.event", data: event });
  return { queued: true };
}
