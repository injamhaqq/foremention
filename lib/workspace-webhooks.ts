import { safeOperationalError } from "@/lib/collection-policy";
import { validatePublicSourceUrl } from "@/lib/source-inspection";
import { supabaseRest } from "@/lib/supabase-rest";

export const WORKSPACE_WEBHOOK_EVENTS = ["collection.completed", "source.reviewed", "action.completed", "evidence.reviewed"] as const;
export type WorkspaceWebhookEvent = typeof WORKSPACE_WEBHOOK_EVENTS[number];
export type DeliveryEvent = { organizationId: string; eventKey: string; eventType: WorkspaceWebhookEvent; occurredAt: string; href: string };
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

export async function deliverWorkspaceWebhooks(event: DeliveryEvent) {
  const masterSecret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!masterSecret) return { delivered: 0, failed: 0, status: "not_configured" as const };
  const endpoints = await supabaseRest<EndpointRow[]>(`workspace_webhook_endpoints?select=id,organization_id,destination_url,event_types,active&organization_id=eq.${event.organizationId}&active=eq.true`, { serviceRole: true });
  let delivered = 0; let failed = 0;
  for (const endpoint of endpoints.filter((row) => row.event_types.includes(event.eventType))) {
    const rows = await supabaseRest<Array<{ id: string; status: string; attempt_count: number }>>("workspace_webhook_deliveries?on_conflict=endpoint_id,event_key", {
      method: "POST", serviceRole: true, prefer: "resolution=ignore-duplicates,return=representation",
      body: { organization_id: event.organizationId, endpoint_id: endpoint.id, event_key: event.eventKey, event_type: event.eventType, status: "pending" },
    });
    const existing = rows[0] ? [] : await supabaseRest<Array<{ id: string; status: string; attempt_count: number }>>(`workspace_webhook_deliveries?select=id,status,attempt_count&endpoint_id=eq.${endpoint.id}&event_key=eq.${encodeURIComponent(event.eventKey)}&limit=1`, { serviceRole: true });
    const delivery = rows[0] || existing[0]; if (!delivery || delivery.status === "delivered" || delivery.attempt_count >= 4) continue;
    const attemptCount = delivery.attempt_count + 1;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ id: event.eventKey, type: event.eventType, occurred_at: event.occurredAt, organization_id: event.organizationId, data: { href: event.href } });
    try {
      const destination = validateWebhookDestination(endpoint.destination_url);
      const secret = await deriveWebhookSigningSecret(endpoint.id, masterSecret);
      const signature = bytesToHex(await hmac(encoder.encode(secret), `${timestamp}.${body}`));
      const response = await fetch(destination, { method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000), headers: { "content-type": "application/json", "user-agent": "Foremention-Webhooks/1.0", "x-foremention-event": event.eventType, "x-foremention-timestamp": timestamp, "x-foremention-signature": `v1=${signature}` }, body });
      if (!response.ok) throw new Error(`Webhook destination returned status ${response.status}.`);
      await supabaseRest(`workspace_webhook_deliveries?id=eq.${delivery.id}&organization_id=eq.${event.organizationId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "delivered", attempt_count: attemptCount, response_status: response.status, delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
      delivered += 1;
    } catch (error) {
      await supabaseRest(`workspace_webhook_deliveries?id=eq.${delivery.id}&organization_id=eq.${event.organizationId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "failed", attempt_count: attemptCount, error_code: safeOperationalError(error), updated_at: new Date().toISOString() } }).catch(() => undefined);
      failed += 1;
    }
  }
  if (failed) throw new Error("One or more workspace webhook deliveries failed and may be retried.");
  return { delivered, failed, status: "processed" as const };
}

export async function webhookSecretForDisplay(endpointId: string, masterSecret: string) {
  return deriveWebhookSigningSecret(endpointId, masterSecret);
}
