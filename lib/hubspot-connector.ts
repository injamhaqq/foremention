import { decryptIntegrationCredential, encryptIntegrationCredential } from "@/lib/integration-crypto";
import { safeOperationalError } from "@/lib/collection-policy";
import { supabaseRest } from "@/lib/supabase-rest";

const encoder = new TextEncoder();
const HUBSPOT_TOKEN_URL = "https://api.hubspot.com/oauth/2026-03/token";
const HUBSPOT_API = "https://api.hubapi.com";

type HubSpotTokens = { access_token: string; refresh_token: string; expires_in: number; scopes?: string[] };
type IntegrationRow = { id: string; organization_id: string; status: string; configuration: Record<string, unknown> };
type CredentialRow = { encrypted_access_token: string; encrypted_refresh_token: string };

function base64Url(value: string) {
  const bytes = encoder.encode(value); let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  let binary = ""; for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function createHubSpotState(organizationId: string, userId: string, secret: string) {
  if (secret.length < 32) throw new Error("HubSpot OAuth state signing is not configured.");
  const payload = base64Url(JSON.stringify({ organizationId, userId, expiresAt: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() }));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyHubSpotState(state: string, organizationId: string, userId: string, secret: string) {
  try {
    const [payload, signature, extra] = state.split(".");
    if (!payload || !signature || extra || signature !== await hmac(payload, secret)) return false;
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const parsed = JSON.parse(json) as { organizationId: string; userId: string; expiresAt: number };
    return parsed.organizationId === organizationId && parsed.userId === userId && parsed.expiresAt > Date.now();
  } catch { return false; }
}

export function hubSpotOAuthReady() {
  return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET && process.env.HUBSPOT_OAUTH_STATE_SECRET && process.env.INTEGRATION_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function tokenRequest(parameters: Record<string, string>) {
  const response = await fetch(HUBSPOT_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HubSpot OAuth returned ${response.status}.`);
  return await response.json() as HubSpotTokens;
}

export async function exchangeHubSpotCode(code: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", client_id: process.env.HUBSPOT_CLIENT_ID || "", client_secret: process.env.HUBSPOT_CLIENT_SECRET || "", redirect_uri: redirectUri, code });
}

export async function saveHubSpotConnection(organizationId: string, projectId: string, userId: string, tokens: HubSpotTokens) {
  const encryptionSecret = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  const integrations = await supabaseRest<IntegrationRow[]>("integrations?on_conflict=organization_id,project_id,provider", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=representation", body: { organization_id: organizationId, project_id: projectId, provider: "hubspot", status: "connected", scopes: tokens.scopes || ["crm.objects.companies.read", "crm.objects.companies.write"], configuration: { expires_at: new Date(Date.now() + Math.max(60, tokens.expires_in - 60) * 1000).toISOString(), project_id: projectId, connected_by: userId }, connected_by: userId, connected_at: new Date().toISOString(), last_synced_at: new Date().toISOString() } });
  const integration = integrations[0]; if (!integration) throw new Error("HubSpot connection could not be recorded.");
  await supabaseRest("integration_credentials?on_conflict=integration_id", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { integration_id: integration.id, encrypted_access_token: await encryptIntegrationCredential(tokens.access_token, encryptionSecret), encrypted_refresh_token: await encryptIntegrationCredential(tokens.refresh_token, encryptionSecret), updated_at: new Date().toISOString() } });
}

async function accessToken(integration: IntegrationRow) {
  const encryptionSecret = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  const credentials = await supabaseRest<CredentialRow[]>(`integration_credentials?select=encrypted_access_token,encrypted_refresh_token&integration_id=eq.${integration.id}&limit=1`, { serviceRole: true });
  const credential = credentials[0]; if (!credential) throw new Error("HubSpot credentials are unavailable.");
  const expiresAt = Date.parse(String(integration.configuration?.expires_at || ""));
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) return decryptIntegrationCredential(credential.encrypted_access_token, encryptionSecret);
  const refreshToken = await decryptIntegrationCredential(credential.encrypted_refresh_token, encryptionSecret);
  const tokens = await tokenRequest({ grant_type: "refresh_token", client_id: process.env.HUBSPOT_CLIENT_ID || "", client_secret: process.env.HUBSPOT_CLIENT_SECRET || "", refresh_token: refreshToken });
  await saveHubSpotConnection(integration.organization_id, String(integration.configuration.project_id || ""), String(integration.configuration.connected_by || ""), tokens);
  return tokens.access_token;
}

async function hubSpotFetch<T>(path: string, token: string, init: RequestInit) {
  const response = await fetch(`${HUBSPOT_API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HubSpot API returned ${response.status}.`);
  return await response.json() as T;
}

export async function deliverHubSpotCompletedAction(input: { organizationId: string; placementId: string; eventKey: string; stage: string; occurredAt: string }) {
  const existing = await supabaseRest<Array<{ id: string; status: string }>>(`integration_activity_deliveries?select=id,status&organization_id=eq.${input.organizationId}&provider=eq.hubspot&event_key=eq.${encodeURIComponent(input.eventKey)}&limit=1`, { serviceRole: true });
  if (existing[0]?.status === "delivered") return { status: "duplicate" as const };
  const integrations = await supabaseRest<IntegrationRow[]>(`integrations?select=id,organization_id,status,configuration&organization_id=eq.${input.organizationId}&provider=eq.hubspot&status=eq.connected&limit=1`, { serviceRole: true });
  const integration = integrations[0]; if (!integration) return { status: "not_connected" as const };
  const placements = await supabaseRest<Array<{ source_url: string; page_title: string | null; entry_route: string }>>(`placements?select=source_url,page_title,entry_route&id=eq.${input.placementId}&organization_id=eq.${input.organizationId}&limit=1`, { serviceRole: true });
  const placement = placements[0]; if (!placement) return { status: "missing_action" as const };
  const token = await accessToken(integration);
  try {
    const result = await hubSpotFetch<{ id: string }>("/crm/v3/objects/notes", token, { method: "POST", body: JSON.stringify({ properties: { hs_timestamp: input.occurredAt, hs_note_body: `Foremention action completed\nStage: ${input.stage.replaceAll("_", " ")}\nRoute: ${placement.entry_route}\nSource: ${placement.page_title || placement.source_url}\nEvidence URL: ${placement.source_url}` } }) });
    await supabaseRest("integration_activity_deliveries?on_conflict=organization_id,provider,event_key", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: input.organizationId, integration_id: integration.id, provider: "hubspot", event_key: input.eventKey, status: "delivered", external_id: result.id, delivered_at: new Date().toISOString(), error_summary: null } });
    return { status: "delivered" as const, externalId: result.id };
  } catch (error) {
    await supabaseRest("integration_activity_deliveries?on_conflict=organization_id,provider,event_key", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: input.organizationId, integration_id: integration.id, provider: "hubspot", event_key: input.eventKey, status: "failed", error_summary: safeOperationalError(error).slice(0, 500) } });
    throw error;
  }
}
