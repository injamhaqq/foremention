import { supabaseRest } from "@/lib/supabase-rest";

/** Opt-in only after migration, Inngest registration, and release acceptance. */
export function durableBillingInboxEnabled() {
  return process.env.FOREMENTION_BILLING_DURABLE_INBOX === "enabled";
}

/** Independent consumer switch: keep draining previously ACKed events during
 * ingress rollback. Disable only after verified zero pending/leased/retry rows. */
export function billingInboxConsumerEnabled() {
  return process.env.FOREMENTION_BILLING_INBOX_CONSUMER === "enabled";
}

type Envelope = { event_id?: unknown; event_type?: unknown };
const EVENT_ID = /^evt_[a-z0-9]{26}$/;

export function verifiedBillingEnvelope(raw: string): { eventId: string; eventType: string } {
  if (new TextEncoder().encode(raw).length > 262144) throw new Error("billing_body_too_large");
  let value: Envelope;
  try { value = JSON.parse(raw) as Envelope; } catch { throw new Error("billing_invalid_json"); }
  if (!value || typeof value !== "object" || !EVENT_ID.test(String(value.event_id || ""))
    || typeof value.event_type !== "string" || value.event_type.length < 3 || value.event_type.length > 100) {
    throw new Error("billing_invalid_envelope");
  }
  return { eventId: String(value.event_id), eventType: value.event_type };
}

async function sha256(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type ClaimedVerifiedBillingEvent = {
  provider: string; event_id: string; source_mode: "sandbox" | "live";
  event_type: string; raw_body: string; generation: number;
  lease_token: string; attempt_count: number;
};

export async function enqueueVerifiedBillingEvent(raw: string, provider: string, mode: string) {
  if (provider !== "paddle" || (mode !== "sandbox" && mode !== "live")) {
    throw new Error("billing_inbox_mode_unavailable");
  }
  const { eventId, eventType } = verifiedBillingEnvelope(raw);
  const digest = await sha256(raw);
  const result = await supabaseRest<{ accepted: boolean; duplicate: boolean }>(
    "rpc/enqueue_verified_billing_event",
    { method: "POST", serviceRole: true, signal: AbortSignal.timeout(2500),
      body: { p_provider: provider, p_event_id: eventId, p_source_mode: mode,
        p_event_type: eventType, p_payload_sha256: digest, p_raw_body: raw } },
  );
  if (!result?.accepted) throw new Error("billing_inbox_not_committed");
  return { eventId, duplicate: Boolean(result.duplicate) };
}

export async function claimVerifiedBillingBatch() {
  const mode = process.env.PADDLE_ENVIRONMENT;
  if (mode !== "sandbox" && mode !== "live") throw new Error("billing_worker_mode_unavailable");
  return supabaseRest<ClaimedVerifiedBillingEvent[]>("rpc/claim_verified_billing_batch", {
    method: "POST", serviceRole: true,
    body: { p_limit: 10, p_lease_seconds: 240, p_source_mode: mode },
  });
}

export async function settleVerifiedBillingEvent(
  row: ClaimedVerifiedBillingEvent,
  outcome: "applied" | "ignored" | "needs_review" | "retry",
  errorCode: string | null = null,
) {
  return supabaseRest<boolean>("rpc/settle_verified_billing_event", {
    method: "POST", serviceRole: true,
    body: { p_provider: row.provider, p_event_id: row.event_id,
      p_generation: row.generation, p_lease_token: row.lease_token,
      p_outcome: outcome, p_error_code: errorCode },
  });
}
