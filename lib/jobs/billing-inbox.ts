import { inngest } from "@/lib/jobs/inngest";
import { supabaseRest } from "@/lib/supabase-rest";
import { logOperationalEvent } from "@/lib/structured-logger";
import { billingProvider } from "@/lib/billing-provider";
import {
  claimVerifiedBillingBatch, billingInboxConsumerEnabled, settleVerifiedBillingEvent,
  type ClaimedVerifiedBillingEvent,
} from "@/lib/billing-verified-inbox";
import { processVerifiedBillingWebhookRawBody } from "@/app/api/billing/webhook/route";

/**
 * Bounded service-role queue drain. The inbound webhook never waits for this.
 * The interval is the crash-safe wake-up; no in-process promises are needed.
 * Do not return or log raw bodies in step outputs / audit events.
 */
export async function drainVerifiedBillingInboxOnce() {
  if (!billingInboxConsumerEnabled()) return { disabled: true, accepted: 0, applied: 0, ignored: 0, review: 0, retry: 0 };
  const provider = billingProvider();
  if (!provider?.configured() || provider.id !== "paddle") throw new Error("billing_worker_provider_unavailable");
  const rows = await claimVerifiedBillingBatch();
  const counts = { disabled: false, accepted: rows.length, applied: 0, ignored: 0, review: 0, retry: 0 };
  for (const row of rows) {
    let outcome: "applied" | "ignored" | "needs_review" | "retry" = "retry";
    let errorCode: string | null = null;
    try {
      if (row.provider !== "paddle" || row.source_mode !== process.env.PADDLE_ENVIRONMENT) {
        errorCode = "billing_worker_environment_mismatch";
      } else if (provider.unmappedPaidTransaction?.(row.raw_body)) {
        // Never pretend a positive-value customer charge was fulfilled when
        // its package cannot be matched to Foremention's verified catalog.
        outcome = "needs_review";
        errorCode = "paid_transaction_unmapped";
      } else {
        const response = await processVerifiedBillingWebhookRawBody(row.raw_body, true);
        if (response.ok) {
          const body = await response.json() as {
            received?: boolean; ignored?: boolean; adjustment?: boolean; duplicate?: boolean;
          };
          // An adjustment is recorded in its separate durable case ledger.
          // An unrelated signed event is auditably ignored, not entitled.
          outcome = body.ignored || body.adjustment ? "ignored" : "applied";
          if (!body.received) {
            outcome = "retry";
            errorCode = "billing_processor_missing_receipt";
          }
        } else {
          errorCode = "billing_processor_retriable";
        }
      }
    } catch {
      // Do not store potentially sensitive provider/server exception messages.
      outcome = "retry";
      errorCode = "billing_worker_failure";
    }
    try {
      const settled = await settleVerifiedBillingEvent(row, outcome, errorCode);
      if (!settled) throw new Error("billing_worker_lease_lost");
      if (outcome === "applied") counts.applied += 1;
      if (outcome === "ignored") counts.ignored += 1;
      if (outcome === "needs_review") counts.review += 1;
      if (outcome === "retry") counts.retry += 1;
    } catch {
      // Keep the signed-verified raw event durably leased until expiration.
      // It is safe to replay: receipt application is transactionally idempotent.
      counts.retry += 1;
    }
  }
  // Operator-visible metadata only. Never log bodies, identities or secrets.
  try {
    const exceptions = await supabaseRest<Array<{ status: string }>>(
      "billing_verified_event_inbox?select=status&status=in.(dead_letter,needs_review)&limit=50",
      { serviceRole: true },
    );
    if (exceptions.length) {
      logOperationalEvent("billing_inbox_operator_review", {
        count: exceptions.length, status: exceptions.length >= 50 ? "at_least_50" : "open",
      });
    }
  } catch {
    logOperationalEvent("billing_inbox_monitor_unavailable", { errorCode: "billing_monitor_read_failed" });
  }
  return counts;
}

export const drainVerifiedBillingInbox = inngest.createFunction(
  {
    id: "drain-verified-billing-inbox",
    retries: 0,
    concurrency: { limit: 1 },
    triggers: { cron: "*/5 * * * *" },
  },
  async () => drainVerifiedBillingInboxOnce(),
);
