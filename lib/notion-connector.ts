import { decryptIntegrationCredential, encryptIntegrationCredential } from "@/lib/integration-crypto";
import { supabaseRest } from "@/lib/supabase-rest";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
type Integration = { id: string; organization_id: string; project_id: string; configuration: Record<string, unknown> };

export function notionOAuthReady() { return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET && process.env.NOTION_OAUTH_STATE_SECRET && process.env.INTEGRATION_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function exchangeNotionCode(code: string, redirectUri: string) {
  const basic = btoa(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`);
  const response = await fetch(`${NOTION_API}/oauth/token`, { method: "POST", headers: { authorization: `Basic ${basic}`, "content-type": "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Notion OAuth returned ${response.status}.`);
  return await response.json() as { access_token: string; workspace_id?: string; workspace_name?: string; bot_id?: string };
}

export async function saveNotionConnection(organizationId: string, projectId: string, userId: string, token: { access_token: string; workspace_id?: string; workspace_name?: string; bot_id?: string }) {
  const rows = await supabaseRest<Integration[]>("integrations?on_conflict=organization_id,project_id,provider", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=representation", body: { organization_id: organizationId, project_id: projectId, provider: "notion", status: "connected", scopes: ["insert_content"], configuration: { workspace_id: token.workspace_id || null, workspace_name: token.workspace_name || null, bot_id: token.bot_id || null, parent_page_id: null }, connected_by: userId, connected_at: new Date().toISOString() } });
  if (!rows[0]) throw new Error("Notion connection could not be recorded.");
  const encrypted = await encryptIntegrationCredential(token.access_token, process.env.INTEGRATION_ENCRYPTION_KEY || "");
  await supabaseRest("integration_credentials?on_conflict=integration_id", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { integration_id: rows[0].id, encrypted_access_token: encrypted, encrypted_refresh_token: encrypted, updated_at: new Date().toISOString() } });
}

async function notionRequest(path: string, token: string, init: RequestInit) {
  const response = await fetch(`${NOTION_API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "Notion-Version": NOTION_VERSION }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Notion API returned ${response.status}.`);
  return await response.json() as { id: string; url?: string };
}

export async function exportWeeklyDigestToNotion(organizationId: string, weekKey: string) {
  const rows = await supabaseRest<Integration[]>(`integrations?select=id,organization_id,project_id,configuration&organization_id=eq.${organizationId}&provider=eq.notion&status=eq.connected&limit=1`, { serviceRole: true });
  const integration = rows[0]; const parentPageId = String(integration?.configuration?.parent_page_id || "");
  if (!integration || !parentPageId) return { status: "not_configured" as const };
  const eventKey = `notion.weekly_digest:${weekKey}`;
  const delivered = await supabaseRest<Array<{ external_id: string | null }>>(`integration_activity_deliveries?select=external_id&organization_id=eq.${organizationId}&provider=eq.notion&event_key=eq.${encodeURIComponent(eventKey)}&status=eq.delivered&limit=1`, { serviceRole: true });
  if (delivered[0]) return { status: "duplicate" as const, externalId: delivered[0].external_id };
  const credentials = await supabaseRest<Array<{ encrypted_access_token: string }>>(`integration_credentials?select=encrypted_access_token&integration_id=eq.${integration.id}&limit=1`, { serviceRole: true });
  if (!credentials[0]) return { status: "not_configured" as const };
  const token = await decryptIntegrationCredential(credentials[0].encrypted_access_token, process.env.INTEGRATION_ENCRYPTION_KEY || "");
  const [organization, runs, sources] = await Promise.all([
    supabaseRest<Array<{ name: string }>>(`organizations?select=name&id=eq.${organizationId}&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ id: string; status: string; answer_count: number; citation_count: number; created_at: string }>>(`runs?select=id,status,answer_count,citation_count,created_at&organization_id=eq.${organizationId}&status=in.(review,complete,partial)&order=created_at.desc&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ page_title: string | null; canonical_url: string }>>(`sources?select=page_title,canonical_url&organization_id=eq.${organizationId}&order=updated_at.desc&limit=10`, { serviceRole: true }),
  ]);
  const run = runs[0]; const rich = (content: string) => [{ type: "text", text: { content: content.slice(0, 1900) } }];
  const page = await notionRequest("/pages", token, { method: "POST", body: JSON.stringify({ parent: { page_id: parentPageId }, properties: { title: { type: "title", title: rich(`Foremention weekly digest · ${weekKey}`) } }, children: [
    { object: "block", type: "paragraph", paragraph: { rich_text: rich(`${organization[0]?.name || "Workspace"}: ${run ? `${run.answer_count} answers and ${run.citation_count} provider-returned citations in the latest recorded run.` : "No completed run was available."}`) } },
    ...sources.map((source) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: rich(`${source.page_title || "Observed source"} — ${source.canonical_url}`) } })),
  ] }) });
  await supabaseRest("integration_activity_deliveries?on_conflict=organization_id,provider,event_key", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { organization_id: organizationId, integration_id: integration.id, provider: "notion", event_key: eventKey, status: "delivered", external_id: page.id, delivered_at: new Date().toISOString() } });
  return { status: "delivered" as const, externalId: page.id, url: page.url || null };
}
