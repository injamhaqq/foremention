import type { Viewer } from "@/lib/auth";
import { demoPlacements, demoRuns, sourceMapEntries } from "@/lib/demo-data";
import { supabaseRest } from "@/lib/supabase-rest";
import type { EntryRoute, Placement, SourceMapEntry, VisibilityRun } from "@/lib/types";

type MembershipRow = { organization_id: string };
type SourceEntryRow = {
  id: string; rank: number; citation_observations: number; engines: SourceMapEntry["engines"];
  client_present: boolean; competitors_present: string[]; entry_route: string | null;
  feasibility: SourceMapEntry["feasibility"]; influence: SourceMapEntry["influence"];
  source: { domain: string; page_title: string | null; canonical_url: string; source_type: string | null; crawler_access: SourceMapEntry["crawlerAccess"] } | null;
};
type RunRow = { id: string; status: VisibilityRun["status"]; prompt_count: number; answer_count: number; citation_count: number; brand_presence_pct: number | string; first_mention_pct: number | string; new_source_count: number; created_at: string };
type PlacementRow = { id: string; source_url: string; page_title: string | null; entry_route: string; stage: string; updated_at: string; target_prompt_ids: string[]; owner_id: string | null };

const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];
const route = (value: string | null): EntryRoute => routes.includes(value as EntryRoute) ? value as EntryRoute : "editorial outreach";
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const relativeLabel = (value: string) => dateLabel(value);
const hostname = (value: string) => { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; } };

export async function getPrimaryOrganizationId(viewer: Viewer) {
  if (viewer.mode === "demo") return "10000000-0000-4000-8000-000000000001";
  const rows = await supabaseRest<MembershipRow[]>(`organization_members?select=organization_id&user_id=eq.${viewer.id}&limit=1`, { token: viewer.accessToken });
  return rows[0]?.organization_id || null;
}

export async function loadSourceMap(viewer: Viewer): Promise<SourceMapEntry[]> {
  if (viewer.mode === "demo") return sourceMapEntries;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<SourceEntryRow[]>(`source_map_entries?select=id,rank,citation_observations,engines,client_present,competitors_present,entry_route,feasibility,influence,source:sources(domain,page_title,canonical_url,source_type,crawler_access)&organization_id=eq.${organizationId}&order=rank.asc`, { token: viewer.accessToken });
  return rows.filter((row) => row.source).map((row) => ({ id: row.id, rank: row.rank, domain: row.source!.domain, title: row.source!.page_title || row.source!.domain, url: row.source!.canonical_url, type: row.source!.source_type || "web source", influence: row.influence, engines: row.engines || [], clientPresent: row.client_present, competitors: row.competitors_present || [], crawlerAccess: row.source!.crawler_access, route: route(row.entry_route), feasibility: row.feasibility, evidenceCount: row.citation_observations }));
}

export async function loadRuns(viewer: Viewer): Promise<VisibilityRun[]> {
  if (viewer.mode === "demo") return demoRuns;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<RunRow[]>(`runs?select=id,status,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${organizationId}&order=created_at.desc`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id.slice(0, 8).toUpperCase(), date: dateLabel(row.created_at), status: row.status, prompts: row.prompt_count, answers: row.answer_count, citations: row.citation_count, presence: Number(row.brand_presence_pct), firstMention: Number(row.first_mention_pct), newSources: row.new_source_count }));
}

export async function loadPlacements(viewer: Viewer): Promise<Placement[]> {
  if (viewer.mode === "demo") return demoPlacements;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<PlacementRow[]>(`placements?select=id,source_url,page_title,entry_route,stage,updated_at,target_prompt_ids,owner_id&organization_id=eq.${organizationId}&order=updated_at.desc`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id.slice(0, 8).toUpperCase(), source: hostname(row.source_url), page: row.page_title || row.source_url, route: route(row.entry_route), owner: row.owner_id ? "Assigned" : "Unassigned", stage: row.stage.replaceAll("_", " ") as Placement["stage"], updated: relativeLabel(row.updated_at), promptImpact: row.target_prompt_ids?.length || 0 }));
}
