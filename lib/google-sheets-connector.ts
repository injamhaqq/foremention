import { decryptIntegrationCredential, encryptIntegrationCredential } from "@/lib/integration-crypto";
import { supabaseRest } from "@/lib/supabase-rest";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
export const SHEETS_DATASETS = ["buyer_questions", "answer_runs", "source_map", "evidence", "actions"] as const;
export type SheetsDataset = typeof SHEETS_DATASETS[number];
type Integration = { id: string; organization_id: string; project_id: string; configuration: Record<string, unknown> };

export function googleSheetsOAuthReady() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_OAUTH_STATE_SECRET && process.env.INTEGRATION_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY); }

async function tokenRequest(parameters: Record<string, string>) {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}.`);
  return await response.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

export async function exchangeGoogleCode(code: string, redirectUri: string) { return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "" }); }

export async function saveGoogleSheetsConnection(organizationId: string, projectId: string, userId: string, tokens: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }) {
  if (!tokens.refresh_token) throw new Error("Google did not return an offline refresh token. Reconnect and approve offline access.");
  const integrations = await supabaseRest<Integration[]>("integrations?on_conflict=organization_id,project_id,provider", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=representation", body: { organization_id: organizationId, project_id: projectId, provider: "google_sheets", status: "connected", scopes: (tokens.scope || "").split(" ").filter(Boolean), configuration: { expires_at: new Date(Date.now() + Math.max(60, tokens.expires_in - 60) * 1000).toISOString(), project_id: projectId, connected_by: userId }, connected_by: userId, connected_at: new Date().toISOString() } });
  const integration = integrations[0]; if (!integration) throw new Error("Google Sheets connection could not be recorded.");
  const encryptionSecret = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  await supabaseRest("integration_credentials?on_conflict=integration_id", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { integration_id: integration.id, encrypted_access_token: await encryptIntegrationCredential(tokens.access_token, encryptionSecret), encrypted_refresh_token: await encryptIntegrationCredential(tokens.refresh_token, encryptionSecret), updated_at: new Date().toISOString() } });
}

async function googleAccessToken(integration: Integration) {
  const rows = await supabaseRest<Array<{ encrypted_access_token: string; encrypted_refresh_token: string }>>(`integration_credentials?select=encrypted_access_token,encrypted_refresh_token&integration_id=eq.${integration.id}&limit=1`, { serviceRole: true }); const credential = rows[0];
  if (!credential) throw new Error("Google Sheets credentials are unavailable.");
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || ""; const expiresAt = Date.parse(String(integration.configuration.expires_at || ""));
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) return decryptIntegrationCredential(credential.encrypted_access_token, secret);
  const refreshToken = await decryptIntegrationCredential(credential.encrypted_refresh_token, secret);
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "" });
  const access = await encryptIntegrationCredential(tokens.access_token, secret);
  await supabaseRest(`integration_credentials?integration_id=eq.${integration.id}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { encrypted_access_token: access, updated_at: new Date().toISOString() } });
  await supabaseRest(`integrations?id=eq.${integration.id}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { configuration: { ...integration.configuration, expires_at: new Date(Date.now() + Math.max(60, tokens.expires_in - 60) * 1000).toISOString() }, last_synced_at: new Date().toISOString() } });
  return tokens.access_token;
}

function csvCell(value: unknown) { if (value === null || value === undefined) return ""; if (typeof value === "object") return JSON.stringify(value); return String(value); }
async function dataset(organizationId: string, name: SheetsDataset): Promise<string[][]> {
  if (name === "buyer_questions") { const rows = await supabaseRest<Array<Record<string, unknown>>>(`prompts?select=id,prompt_text,intent,active,created_at&organization_id=eq.${organizationId}&order=created_at.desc&limit=5000`, { serviceRole: true }); return [["id","question","intent","active","created_at"], ...rows.map((r) => [r.id,r.prompt_text,r.intent,r.active,r.created_at].map(csvCell))]; }
  if (name === "answer_runs") { const rows = await supabaseRest<Array<Record<string, unknown>>>(`runs?select=id,status,provider_ids,prompt_count,answer_count,citation_count,actual_cost_usd,created_at,completed_at&organization_id=eq.${organizationId}&order=created_at.desc&limit=5000`, { serviceRole: true }); return [["id","status","providers","questions","answers","citations","cost_usd","created_at","completed_at"], ...rows.map((r) => [r.id,r.status,r.provider_ids,r.prompt_count,r.answer_count,r.citation_count,r.actual_cost_usd,r.created_at,r.completed_at].map(csvCell))]; }
  if (name === "source_map") { const rows = await supabaseRest<Array<Record<string, unknown>>>(`sources?select=id,canonical_url,domain,page_title,source_type,crawler_access,first_observed_at,last_observed_at&organization_id=eq.${organizationId}&order=last_observed_at.desc&limit=5000`, { serviceRole: true }); return [["id","url","domain","title","type","crawler_access","first_observed","last_observed"], ...rows.map((r) => [r.id,r.canonical_url,r.domain,r.page_title,r.source_type,r.crawler_access,r.first_observed_at,r.last_observed_at].map(csvCell))]; }
  if (name === "evidence") { const rows = await supabaseRest<Array<Record<string, unknown>>>(`evidence_items?select=id,evidence_type,title,source_url,verification_status,observed_at,created_at&organization_id=eq.${organizationId}&order=created_at.desc&limit=5000`, { serviceRole: true }); return [["id","type","title","source_url","verification_status","observed_at","created_at"], ...rows.map((r) => [r.id,r.evidence_type,r.title,r.source_url,r.verification_status,r.observed_at,r.created_at].map(csvCell))]; }
  const rows = await supabaseRest<Array<Record<string, unknown>>>(`placements?select=id,source_url,page_title,entry_route,stage,updated_at&organization_id=eq.${organizationId}&order=updated_at.desc&limit=5000`, { serviceRole: true }); return [["id","source_url","page_title","legitimate_route","stage","updated_at"], ...rows.map((r) => [r.id,r.source_url,r.page_title,r.entry_route,r.stage,r.updated_at].map(csvCell))];
}

async function googleFetch<T>(url: string, token: string, init: RequestInit) { const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(20_000) }); if (!response.ok) throw new Error(`Google Sheets API returned ${response.status}.`); return await response.json() as T; }

export async function exportDatasetToGoogleSheets(organizationId: string, name: SheetsDataset) {
  const integrations = await supabaseRest<Integration[]>(`integrations?select=id,organization_id,project_id,configuration&organization_id=eq.${organizationId}&provider=eq.google_sheets&status=eq.connected&limit=1`, { serviceRole: true }); const integration = integrations[0]; if (!integration) return { status: "not_configured" as const };
  const token = await googleAccessToken(integration); const values = await dataset(organizationId, name); const createdAt = new Date().toISOString();
  const sheet = await googleFetch<{ spreadsheetId: string; spreadsheetUrl: string }>(SHEETS_API, token, { method: "POST", body: JSON.stringify({ properties: { title: `Foremention ${name.replaceAll("_", " ")} · ${createdAt.slice(0, 10)}` }, sheets: [{ properties: { title: name.slice(0, 90) } }] }) });
  await googleFetch(`${SHEETS_API}/${sheet.spreadsheetId}/values/${encodeURIComponent(`${name}!A1`)}?valueInputOption=RAW`, token, { method: "PUT", body: JSON.stringify({ range: `${name}!A1`, majorDimension: "ROWS", values }) });
  const eventKey = `google_sheets.export:${name}:${sheet.spreadsheetId}`;
  await supabaseRest("integration_activity_deliveries?on_conflict=organization_id,provider,event_key", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: organizationId, integration_id: integration.id, provider: "google_sheets", event_key: eventKey, status: "delivered", external_id: sheet.spreadsheetId, delivered_at: createdAt } });
  return { status: "delivered" as const, spreadsheetId: sheet.spreadsheetId, spreadsheetUrl: sheet.spreadsheetUrl, rows: Math.max(0, values.length - 1) };
}
