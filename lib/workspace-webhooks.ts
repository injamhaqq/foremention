import { safeOperationalError } from "@/lib/collection-policy";
import { assertPublicSourceResolution, validatePublicSourceUrl } from "@/lib/source-inspection";
import { assertApprovedWorkspaceWebhookDestination, workspaceWebhookDeliveryEnabled } from "@/lib/webhook-egress-policy";
import { supabaseRest } from "@/lib/supabase-rest";

export const WORKSPACE_WEBHOOK_EVENTS = ["collection.completed", "source.reviewed", "action.completed", "evidence.reviewed"] as const;
export type WorkspaceWebhookEvent = typeof WORKSPACE_WEBHOOK_EVENTS[number];
export type DeliveryEvent = { organizationId: string; projectId: string; eventKey: string; eventType: WorkspaceWebhookEvent; occurredAt: string; href: string };
type EndpointRow = { id: string; organization_id: string; destination_url: string; event_types: string[]; active: boolean };

const encoder = new TextEncoder();
const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
async function hmac(keyBytes: Uint8Array, value: string) {
  const key = await crypto.subtle.importKey("raw", keyBytes.slice().buffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function validateWebhookDestination(value: string) {
  const url = validatePublicSourceUrl(value.trim());
  if (url.protocol !== "https:") throw new Error("Webhook destinations must use HTTPS.");
  return url.toString();
}

export async function deriveWebhookSigningSecret(endpointId: string, masterSecret: string) {
  if (masterSecret.length < 32) throw new Error("Webhook signing is not configured.");
  return `whsec_${bytesToBase64Url(await hmac(encoder.encode(masterSecret), `foremention:webhook:${endpointId}`))}`;
}

type WebhookClaim = { delivery_id: string; attempt_count: number };

async function settleWebhookAttempt(
  organizationId: string,
  claim: WebhookClaim,
  status: "delivered" | "failed",
  responseStatus: number | null,
  errorCode: string | null,
) {
  return supabaseRest<boolean>("rpc/settle_workspace_webhook_delivery", {
    method: "POST", serviceRole: true,
    body: {
      p_organization_id: organizationId,
      p_delivery_id: claim.delivery_id,
      p_attempt_count: claim.attempt_count,
      p_status: status,
      p_response_status: responseStatus,
      p_error_code: errorCode,
    },
  });
}

export async function deliverWorkspaceWebhooks(event: DeliveryEvent) {
  const masterSecret = process.env.WEBHOOK_SIGNING_SECRET;
  // The migration gate is independent of the operator egress allowlist.
  // Missing RPCs must not fall back to unclaimed outbound delivery.
  if (!masterSecret || !workspaceWebhookDeliveryEnabled()
    || process.env.WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED !== "1") {
    return { delivered: 0, failed: 0, status: "not_configured" as const };
  }
  const projects = await supabaseRest<Array<{ id: string }>>(
    `projects?select=id&id=eq.${encodeURIComponent(event.projectId)}&organization_id=eq.${event.organizationId}&status=eq.active&limit=1`,
    { serviceRole: true },
  );
  if (!projects[0]) return { delivered: 0, failed: 0, status: "invalid_project" as const };
  const endpoints = await supabaseRest<EndpointRow[]>(
    `workspace_webhook_endpoints?select=id,organization_id,destination_url,event_types,active&organization_id=eq.${event.organizationId}&active=eq.true`,
    { serviceRole: true },
  );
  let delivered = 0;
  let failed = 0;
  for (const endpoint of endpoints.filter((row) => row.event_types.includes(event.eventType))) {
    let claim: WebhookClaim | null = null;
    try {
      const destination = assertApprovedWorkspaceWebhookDestination(validateWebhookDestination(endpoint.destination_url));
      await assertPublicSourceResolution(destination);
      claim = await supabaseRest<WebhookClaim | null>("rpc/claim_workspace_webhook_delivery", {
        method: "POST", serviceRole: true,
        body: {
          p_organization_id: event.organizationId,
          p_project_id: event.projectId,
          p_endpoint_id: endpoint.id,
          p_event_key: event.eventKey,
          p_event_type: event.eventType,
        },
      });
      if (!claim) continue; // Already delivered, actively leased, or exhausted.
      if (!Number.isInteger(claim.attempt_count) || claim.attempt_count < 1 || claim.attempt_count > 4) {
        throw new Error("Unexpected webhook attempt receipt.");
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({
        id: event.eventKey, type: event.eventType, occurred_at: event.occurredAt,
        organization_id: event.organizationId, project_id: event.projectId,
        data: { href: event.href, project_id: event.projectId },
      });
      const secret = await deriveWebhookSigningSecret(endpoint.id, masterSecret);
      const signature = bytesToHex(await hmac(encoder.encode(secret), `${timestamp}.${body}`));

      let response: Response;
      try {
        response = await fetch(destination, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000),
          headers: {
            "content-type": "application/json", "user-agent": "Foremention-Webhooks/1.0",
            "x-foremention-event": event.eventType,
            "x-foremention-timestamp": timestamp, "x-foremention-signature": `v1=${signature}`,
          },
          body,
        });
        if (!response.ok) throw new Error(`Webhook destination returned status ${response.status}.`);
      } catch (error) {
        const settled = await settleWebhookAttempt(
          event.organizationId, claim, "failed", null, safeOperationalError(error),
        );
        if (!settled) throw new Error("Webhook delivery lease was lost before failure settlement.");
        failed += 1;
        continue;
      }

      // An external success followed by a missing DB acknowledgement is UNCERTAIN.
      // Never rewrite it as failed; the recipient must deduplicate event IDs.
      const settled = await settleWebhookAttempt(
        event.organizationId, claim, "delivered", response.status, null,
      );
      if (!settled) throw new Error("Webhook delivery lease was lost after external success.");
      delivered += 1;
    } catch {
      // Opaque failure: do not include customer URLs, signatures or payloads.
      // If a claim was obtained, its 90s lease can expire and be reclaimed.
      failed += 1;
    }
  }
  if (failed) throw new Error("One or more workspace webhook deliveries failed and may be retried.");
  return { delivered, failed, status: "processed" as const };
}

export async function webhookSecretForDisplay(endpointId: string, masterSecret: string) {
  return deriveWebhookSigningSecret(endpointId, masterSecret);
}
