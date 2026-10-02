import type { Viewer } from "@/lib/auth";
import { loadPlacements, loadPrompts, loadWorkspaceCompetitors, loadWorkspaceContext } from "@/lib/data";
import { buildDemoWorkspaceSearch } from "@/lib/demo-workspace-search";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
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
type CompetitorRow = { id: string; name: string; website: string | null; competitor_type: string; active: boolean };
type SourceSearchRow = Awaited<ReturnType<typeof loadTruthfulSourceMap>>[number];
type ActionRow = Awaited<ReturnType<typeof loadPlacements>>[number];

const PLACEMENT_STAGES = new Set([
  "identified",
  "qualified",
  "pitched",
  "accepted",
  "published",
  "indexed",
  "first_cited",
  "repeatedly_cited",
  "decayed",
  "closed",
]);

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

  // Demo mode is a fictional product tour, not an anonymous tenant. Resolve
  // its existing in-memory fixtures and return before any workspace-context or
  // Supabase search path can execute.
  if (viewer.mode === "demo") {
    const [prompts, competitors] = await Promise.all([
      loadPrompts(viewer),
      loadWorkspaceCompetitors(viewer),
    ]);
    return {
      query,
      results: buildDemoWorkspaceSearch(query, prompts, competitors),
      failedKinds: [],
    };
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) return { query, results: [], failedKinds: [] };
  const pattern = contains(query);
  const token = viewer.accessToken;
  const normalizedStage = query.toLowerCase().replace(/\s+/g, "_");
  const sourceMapPromise = loadTruthfulSourceMap(viewer);

  const searches = await Promise.all([
    attempt("Question", supabaseRest<PromptRow[]>(
      `prompts?select=id,prompt_text,prompt_key,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&or=(prompt_text.ilike.${pattern},prompt_key.ilike.${pattern})&order=created_at.desc&limit=12`,
      { token },
    )),
    attempt("AI Result", supabaseRest<AnswerRow[]>(
      `run_answers?select=id,run_id,prompt_text,prompt_key,answer_text,provider,model,collected_at,run:runs!inner(project_id)&organization_id=eq.${context.organizationId}&run.project_id=eq.${context.projectId}&review_status=eq.verified&or=(prompt_text.ilike.${pattern},prompt_key.ilike.${pattern},answer_text.ilike.${pattern})&order=collected_at.desc&limit=12`,
      { token },
    )),
    attempt("Source", sourceMapPromise),
    attempt("Competitor", supabaseRest<CompetitorRow[]>(
      `competitors?select=id,name,website,competitor_type,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&or=(name.ilike.${pattern},website.ilike.${pattern})&order=updated_at.desc&limit=12`,
      { token },
    )),
    attempt("Opportunity", sourceMapPromise),
    attempt("Action", loadPlacements(viewer)),
  ]);

  const failedKinds = searches.filter((item) => item.failed).map((item) => item.kind);
  const [questions, answers, sources, competitors, opportunities, actions] = searches.map((item) => item.value) as [PromptRow[] | null, AnswerRow[] | null, SourceSearchRow[] | null, CompetitorRow[] | null, SourceSearchRow[] | null, ActionRow[] | null];
  const lower = query.toLocaleLowerCase();
  const sourceRows = (sources || []).filter((item) => {
    const haystack = `${item.domain} ${item.title} ${item.url} ${item.type}`.toLocaleLowerCase();
    return haystack.includes(lower);
  }).slice(0, 12);
  const opportunityRows = (opportunities || []).filter((item) => {
    if (
      !item.reviewedAt
      || item.clientPresent
      || item.influence === "unknown"
      || item.feasibility === "unknown"
      || item.route === "unknown"
    ) return false;
    const haystack = `${item.domain} ${item.title} ${item.url} ${item.route}`.toLocaleLowerCase();
    return haystack.includes(lower);
  }).slice(0, 12);
  const actionRows = (actions || []).filter((item) => {
    const stage = item.stage.replaceAll(" ", "_").toLowerCase();
    const haystack = `${item.source} ${item.page} ${item.route} ${item.stage}`.toLocaleLowerCase();
    return haystack.includes(lower) || (PLACEMENT_STAGES.has(normalizedStage) && stage === normalizedStage);
  }).slice(0, 12);

  const results: WorkspaceSearchResult[] = [
    ...(questions || []).map((item) => ({ id: `question-${item.id}`, kind: "Question" as const, title: item.prompt_text || item.prompt_key, detail: item.active ? "Active buyer question" : "Paused buyer question", meta: "Questions", href: "/app/prompts" })),
    ...(answers || []).map((item) => ({ id: `answer-${item.id}`, kind: "AI Result" as const, title: item.prompt_text || item.prompt_key, detail: excerpt(item.answer_text), meta: `${item.provider}${item.model ? ` · ${item.model}` : ""} · ${dateLabel(item.collected_at)}`, href: `/app/runs/${item.run_id}` })),
    ...sourceRows.map((item) => ({ id: `source-${item.sourceId || item.id}`, kind: "Source" as const, title: item.title || item.domain, detail: item.url, meta: `${item.type || "Cited source"}${item.reviewedAt ? ` · reviewed ${item.reviewedAt}` : " · needs review"}`, href: "/app/source-map" })),
    ...(competitors || []).map((item) => ({ id: `competitor-${item.id}`, kind: "Competitor" as const, title: item.name, detail: item.website || `${item.competitor_type} competitor`, meta: item.active ? "Tracking active" : "Tracking paused", href: "/app/competitors" })),
    ...opportunityRows.map((item) => ({ id: `opportunity-${item.id}`, kind: "Opportunity" as const, title: item.title || item.domain || "Reviewed source gap", detail: "Human-reviewed cited page where your brand was not observed.", meta: `${item.evidenceCount} citation observation${item.evidenceCount === 1 ? "" : "s"}${item.route !== "unknown" ? ` · ${item.route}` : ""}`, href: "/app/opportunities" })),
    ...actionRows.map((item) => ({ id: `action-${item.id}`, kind: "Action" as const, title: item.page || item.source, detail: `${item.stage} · ${item.route}`, meta: `Updated ${item.updated}`, href: "/app/placements" })),
  ];

  return { query, results, failedKinds };
}
