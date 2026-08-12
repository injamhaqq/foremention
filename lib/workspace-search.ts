import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export type WorkspaceSearchKind = "Question" | "AI Result" | "Source" | "Competitor" | "Opportunity" | "Action";
export type WorkspaceSearchResult = {
  id: string;
  kind: WorkspaceSearchKind;
  title: string;
  detail: string;
  meta: string;
  href: string;
};
export type WorkspaceSearchResponse = {
  query: string;
  results: WorkspaceSearchResult[];
  failedKinds: WorkspaceSearchKind[];
};

type PromptRow = { id: string; prompt_text: string; prompt_key: string; active: boolean };
type AnswerRow = { id: string; run_id: string; prompt_text: string | null; prompt_key: string; answer_text: string; provider: string; model: string | null; collected_at: string };
type SourceRow = { id: string; domain: string; page_title: string | null; canonical_url: string; source_type: string | null; crawler_checked_at: string | null };
type CompetitorRow = { id: string; name: string; website: string | null; competitor_type: string; active: boolean };
type OpportunityRow = { id: string; citation_observations: number; entry_route: string | null; feasibility: string; influence: string; source: { domain: string; page_title: string | null; canonical_url: string; crawler_checked_at: string | null } | null };
type ActionRow = { id: string; source_url: string; page_title: string | null; entry_route: string; stage: string; updated_at: string };

const clean = (value: string) => value
  .normalize("NFKC")
  .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 80);
const excerpt = (value: string, limit = 180) => {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const contains = (query: string) => encodeURIComponent(`*${query}*`);

async function attempt<T>(kind: WorkspaceSearchKind, task: Promise<T>) {
  try { return { kind, value: await task, failed: false as const }; }
  catch { return { kind, value: null, failed: true as const }; }
}

export async function searchWorkspace(viewer: Viewer, rawQuery: string): Promise<WorkspaceSearchResponse> {
  const query = clean(rawQuery);
  if (!query) return { query: "", results: [], failedKinds: [] };
  const context = await loadWorkspaceContext(viewer);
  if (!context) return { query, results: [], failedKinds: [] };
  const pattern = contains(query);
  const token = viewer.accessToken;

  const searches = await Promise.all([
    attempt("Question", supabaseRest<PromptRow[]>(
      `prompts?select=id,prompt_text,prompt_key,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&or=(prompt_text.ilike.${pattern},prompt_key.ilike.${pattern})&order=created_at.desc&limit=12`,
      { token },
    )),
    attempt("AI Result", supabaseRest<AnswerRow[]>(
      `run_answers?select=id,run_id,prompt_text,prompt_key,answer_text,provider,model,collected_at,run:runs!inner(project_id)&organization_id=eq.${context.organizationId}&run.project_id=eq.${context.projectId}&review_status=eq.verified&or=(prompt_text.ilike.${pattern},prompt_key.ilike.${pattern},answer_text.ilike.${pattern})&order=collected_at.desc&limit=12`,
      { token },
    )),
    attempt("Source", supabaseRest<SourceRow[]>(
      `sources?select=id,domain,page_title,canonical_url,source_type,crawler_checked_at&organization_id=eq.${context.organizationId}&or=(domain.ilike.${pattern},page_title.ilike.${pattern},canonical_url.ilike.${pattern})&order=updated_at.desc&limit=12`,
      { token },
    )),
    attempt("Competitor", supabaseRest<CompetitorRow[]>(
      `competitors?select=id,name,website,competitor_type,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&or=(name.ilike.${pattern},website.ilike.${pattern})&order=updated_at.desc&limit=12`,
      { token },
    )),
    attempt("Opportunity", supabaseRest<OpportunityRow[]>(
      `source_map_entries?select=id,citation_observations,entry_route,feasibility,influence,source:sources(domain,page_title,canonical_url,crawler_checked_at)&organization_id=eq.${context.organizationId}&client_present=eq.false&order=rank.asc&limit=100`,
      { token },
    )),
    attempt("Action", supabaseRest<ActionRow[]>(
      `placements?select=id,source_url,page_title,entry_route,stage,updated_at&organization_id=eq.${context.organizationId}&or=(source_url.ilike.${pattern},page_title.ilike.${pattern},entry_route.ilike.${pattern},stage.ilike.${pattern})&order=updated_at.desc&limit=12`,
      { token },
    )),
  ]);

  const failedKinds = searches.filter((item) => item.failed).map((item) => item.kind);
  const [questions, answers, sources, competitors, opportunities, actions] = searches.map((item) => item.value) as [PromptRow[] | null, AnswerRow[] | null, SourceRow[] | null, CompetitorRow[] | null, OpportunityRow[] | null, ActionRow[] | null];
  const lower = query.toLocaleLowerCase();
  const opportunityRows = (opportunities || []).filter((item) => {
    if (!item.source?.crawler_checked_at) return false;
    const haystack = `${item.source.domain} ${item.source.page_title || ""} ${item.source.canonical_url} ${item.entry_route || ""}`.toLocaleLowerCase();
    return haystack.includes(lower);
  }).slice(0, 12);

  const results: WorkspaceSearchResult[] = [
    ...(questions || []).map((item) => ({ id: `question-${item.id}`, kind: "Question" as const, title: item.prompt_text || item.prompt_key, detail: item.active ? "Active buyer question" : "Paused buyer question", meta: "Questions", href: "/app/prompts" })),
    ...(answers || []).map((item) => ({ id: `answer-${item.id}`, kind: "AI Result" as const, title: item.prompt_text || item.prompt_key, detail: excerpt(item.answer_text), meta: `${item.provider}${item.model ? ` · ${item.model}` : ""} · ${dateLabel(item.collected_at)}`, href: `/app/runs/${item.run_id}` })),
    ...(sources || []).map((item) => ({ id: `source-${item.id}`, kind: "Source" as const, title: item.page_title || item.domain, detail: item.canonical_url, meta: `${item.source_type || "Cited source"}${item.crawler_checked_at ? ` · reviewed ${dateLabel(item.crawler_checked_at)}` : " · needs review"}`, href: "/app/source-map" })),
    ...(competitors || []).map((item) => ({ id: `competitor-${item.id}`, kind: "Competitor" as const, title: item.name, detail: item.website || `${item.competitor_type} competitor`, meta: item.active ? "Tracking active" : "Tracking paused", href: "/app/competitors" })),
    ...opportunityRows.map((item) => ({ id: `opportunity-${item.id}`, kind: "Opportunity" as const, title: item.source?.page_title || item.source?.domain || "Reviewed source gap", detail: "Human-reviewed cited page where your brand was not observed.", meta: `${item.citation_observations} citation observation${item.citation_observations === 1 ? "" : "s"}${item.entry_route ? ` · ${item.entry_route}` : ""}`, href: "/app/opportunities" })),
    ...(actions || []).map((item) => ({ id: `action-${item.id}`, kind: "Action" as const, title: item.page_title || item.source_url, detail: `${item.stage} · ${item.entry_route}`, meta: `Updated ${dateLabel(item.updated_at)}`, href: "/app/placements" })),
  ];

  return { query, results, failedKinds };
}
