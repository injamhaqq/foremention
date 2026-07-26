import type { Viewer } from "@/lib/auth";
import { demoPlacements, demoRuns, sourceMapEntries } from "@/lib/demo-data";
import { supabaseRest } from "@/lib/supabase-rest";
import type { EntryRoute, Placement, SourceMapEntry, VisibilityRun } from "@/lib/types";

type MembershipRow = { organization_id: string };
type SourceEntryRow = {
  id: string; source_id: string; rank: number; citation_observations: number; engines: SourceMapEntry["engines"];
  client_present: boolean; competitors_present: string[]; entry_route: string | null;
  feasibility: SourceMapEntry["feasibility"]; influence: SourceMapEntry["influence"];
  source: { domain: string; page_title: string | null; canonical_url: string; source_type: string | null; crawler_access: SourceMapEntry["crawlerAccess"]; crawler_checked_at: string | null } | null;
};
type RunRow = { id: string; status: VisibilityRun["status"]; prompt_count: number; answer_count: number; citation_count: number; brand_presence_pct: number | string; first_mention_pct: number | string; new_source_count: number; created_at: string };
type PlacementRow = { id: string; source_url: string; page_title: string | null; entry_route: string; stage: string; updated_at: string; target_prompt_ids: string[]; owner_id: string | null };

export type WorkspacePrompt = { id: string; cluster: string; text: string; approved: boolean };
export type WorkspaceSummary = { organizationId: string; organizationName: string; website: string | null; category: string | null; promptCount: number };
export type WorkspaceContext = {
  organizationId: string;
  projectId: string;
  categoryId: string;
  clusterId: string | null;
  organizationName: string;
  website: string | null;
  category: string;
};
export type WorkspaceEvidence = {
  id: string;
  type: string;
  title: string;
  sourceUrl: string | null;
  status: "unverified" | "verified" | "expired" | "rejected";
  verifiedAt: string | null;
  expiresAt: string | null;
  rights: string | null;
};
export type WorkspaceRunAnswer = {
  id: string;
  prompt: string;
  provider: string;
  model: string | null;
  answer: string;
  citations: Array<{ url: string; title?: string }>;
  status: "unreviewed" | "verified" | "excluded";
  collectedAt: string;
};
export type ProviderStatus = { id: "openai" | "gemini" | "anthropic" | "perplexity"; label: string; configured: boolean };
export type DecisionSignal = {
  reviewedRuns: number;
  latestRunId: string | null;
  latestRunDate: string | null;
  providerCount: number;
  promptCount: number;
  answerCount: number;
  answerCompletionPct: number | null;
  recommendationConsensusPct: number | null;
  presenceRange: number | null;
  presenceDelta: number | null;
  sourceReviewPct: number | null;
  sourceDependencyPct: number | null;
  recurringSourcePct: number | null;
  evidenceObservations: number;
  decisionReadiness: "ready" | "directional" | "insufficient";
  actions: Array<{
    priority: "now" | "next" | "watch";
    title: string;
    reason: string;
    href: string;
  }>;
};

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
  const maps = await supabaseRest<Array<{ id: string }>>(`source_maps?select=id&organization_id=eq.${organizationId}&order=created_at.desc&limit=1`, { token: viewer.accessToken });
  if (!maps[0]) return [];
  const rows = await supabaseRest<SourceEntryRow[]>(`source_map_entries?select=id,source_id,rank,citation_observations,engines,client_present,competitors_present,entry_route,feasibility,influence,source:sources(domain,page_title,canonical_url,source_type,crawler_access,crawler_checked_at)&source_map_id=eq.${maps[0].id}&order=rank.asc`, { token: viewer.accessToken });
  return rows.filter((row) => row.source).map((row) => ({ id: row.id, sourceId: row.source_id, rank: row.rank, domain: row.source!.domain, title: row.source!.page_title || row.source!.domain, url: row.source!.canonical_url, type: row.source!.source_type || "web source", influence: row.influence === "low" ? "emerging" : row.influence, engines: row.engines || [], clientPresent: row.client_present, competitors: row.competitors_present || [], crawlerAccess: row.source!.crawler_access, route: route(row.entry_route), feasibility: row.feasibility, evidenceCount: row.citation_observations, reviewedAt: row.source!.crawler_checked_at ? dateLabel(row.source!.crawler_checked_at) : null }));
}

export async function loadRuns(viewer: Viewer): Promise<VisibilityRun[]> {
  if (viewer.mode === "demo") return demoRuns;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<RunRow[]>(`runs?select=id,status,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${organizationId}&order=created_at.desc`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id, date: dateLabel(row.created_at), status: row.status, prompts: row.prompt_count, answers: row.answer_count, citations: row.citation_count, presence: Number(row.brand_presence_pct), firstMention: Number(row.first_mention_pct), newSources: row.new_source_count }));
}

export async function loadPlacements(viewer: Viewer): Promise<Placement[]> {
  if (viewer.mode === "demo") return demoPlacements;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<PlacementRow[]>(`placements?select=id,source_url,page_title,entry_route,stage,updated_at,target_prompt_ids,owner_id&organization_id=eq.${organizationId}&order=updated_at.desc`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id, source: hostname(row.source_url), page: row.page_title || row.source_url, route: route(row.entry_route), owner: row.owner_id ? "Assigned" : "Unassigned", stage: row.stage.replaceAll("_", " ") as Placement["stage"], updated: relativeLabel(row.updated_at), promptImpact: row.target_prompt_ids?.length || 0 }));
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    { id: "openai", label: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) },
    { id: "gemini", label: "Google Gemini", configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL) },
    { id: "anthropic", label: "Anthropic Claude", configured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) },
    { id: "perplexity", label: "Perplexity", configured: Boolean(process.env.PERPLEXITY_API_KEY) },
  ];
}

export async function loadWorkspaceContext(viewer: Viewer): Promise<WorkspaceContext | null> {
  if (viewer.mode === "demo") return { organizationId: "10000000-0000-4000-8000-000000000001", projectId: "20000000-0000-4000-8000-000000000001", categoryId: "30000000-0000-4000-8000-000000000001", clusterId: "40000000-0000-4000-8000-000000000001", organizationName: "Northstar HR", website: "https://northstarhr.example", category: "HR software for distributed teams" };
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const [organizations, projects, categories, clusters] = await Promise.all([
    supabaseRest<Array<{ name: string; website: string | null }>>(`organizations?select=name,website&id=eq.${organizationId}&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`projects?select=id&organization_id=eq.${organizationId}&status=eq.active&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string; name: string }>>(`categories?select=id,name&organization_id=eq.${organizationId}&active=eq.true&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`prompt_clusters?select=id&organization_id=eq.${organizationId}&order=priority.asc&limit=1`, { token: viewer.accessToken }),
  ]);
  if (!organizations[0] || !projects[0] || !categories[0]) return null;
  return { organizationId, projectId: projects[0].id, categoryId: categories[0].id, clusterId: clusters[0]?.id || null, organizationName: organizations[0].name, website: organizations[0].website, category: categories[0].name };
}

export async function loadEvidence(viewer: Viewer): Promise<WorkspaceEvidence[]> {
  if (viewer.mode === "demo") return [];
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const rows = await supabaseRest<Array<{ id: string; evidence_type: string; title: string; source_url: string | null; verification_status: WorkspaceEvidence["status"]; verified_at: string | null; expires_at: string | null; usage_rights: string | null }>>(
    `evidence_items?select=id,evidence_type,title,source_url,verification_status,verified_at,expires_at,usage_rights&project_id=eq.${context.projectId}&order=created_at.desc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, type: row.evidence_type, title: row.title, sourceUrl: row.source_url, status: row.verification_status, verifiedAt: row.verified_at ? dateLabel(row.verified_at) : null, expiresAt: row.expires_at ? dateLabel(row.expires_at) : null, rights: row.usage_rights }));
}

export async function loadRunAnswers(viewer: Viewer, runId: string): Promise<WorkspaceRunAnswer[]> {
  if (viewer.mode === "demo") return [];
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{ id: string; prompt_key: string; provider: string; model: string | null; answer_text: string; citations_json: WorkspaceRunAnswer["citations"]; review_status: WorkspaceRunAnswer["status"]; collected_at: string }>>(
    `run_answers?select=id,prompt_key,provider,model,answer_text,citations_json,review_status,collected_at&organization_id=eq.${organizationId}&run_id=eq.${runId}&order=collected_at.asc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, prompt: row.prompt_key, provider: row.provider, model: row.model, answer: row.answer_text, citations: row.citations_json || [], status: row.review_status, collectedAt: dateLabel(row.collected_at) }));
}

const demoPrompts: WorkspacePrompt[] = [
  { id: "demo-1", cluster: "Discovery", text: "Best HR software for distributed teams", approved: true },
  { id: "demo-2", cluster: "Use case", text: "What HR platform works for a 200-person remote company?", approved: true },
  { id: "demo-3", cluster: "Comparison", text: "Northstar HR vs Deel for a global team", approved: false },
  { id: "demo-4", cluster: "Alternative", text: "Best alternatives to Rippling for distributed companies", approved: true },
  { id: "demo-5", cluster: "Trust", text: "Most reliable HRIS for cross-border compliance", approved: false },
  { id: "demo-6", cluster: "Constraint", text: "Affordable HR platform for a remote startup", approved: true },
];

export async function loadPrompts(viewer: Viewer): Promise<WorkspacePrompt[]> {
  if (viewer.mode === "demo") return demoPrompts;
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{ id: string; prompt_key: string; prompt_text: string; active: boolean; prompt_clusters: { name: string } | null }>>(
    `prompts?select=id,prompt_key,prompt_text,active,prompt_clusters(name)&organization_id=eq.${organizationId}&order=created_at.asc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, cluster: row.prompt_clusters?.name || row.prompt_key || "Baseline", text: row.prompt_text, approved: row.active }));
}

export async function loadWorkspaceSummary(viewer: Viewer): Promise<WorkspaceSummary | null> {
  if (viewer.mode === "demo") return { organizationId: "10000000-0000-4000-8000-000000000001", organizationName: "Northstar HR", website: "northstarhr.example", category: "HR software for distributed teams", promptCount: demoPrompts.filter((prompt) => prompt.approved).length };
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const [organizations, categories, prompts] = await Promise.all([
    supabaseRest<Array<{ name: string; website: string | null }>>(`organizations?select=name,website&id=eq.${organizationId}&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ name: string }>>(`categories?select=name&organization_id=eq.${organizationId}&active=eq.true&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`prompts?select=id&organization_id=eq.${organizationId}&active=eq.true`, { token: viewer.accessToken }),
  ]);
  const organization = organizations[0];
  if (!organization) return null;
  return { organizationId, organizationName: organization.name, website: organization.website, category: categories[0]?.name || null, promptCount: prompts.length };
}

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function buildDecisionActions(signal: Omit<DecisionSignal, "actions">): DecisionSignal["actions"] {
  const actions: DecisionSignal["actions"] = [];
  if (signal.reviewedRuns < 2) actions.push({ priority: "now", title: "Establish a repeatable baseline", reason: "One reviewed run cannot separate a durable pattern from answer variation.", href: "/app/runs" });
  if (signal.answerCompletionPct !== null && signal.answerCompletionPct < 90) actions.push({ priority: "now", title: "Repair collection coverage", reason: `${signal.answerCompletionPct}% of the expected answer matrix was reviewed. Diagnose failed provider or prompt combinations before acting.`, href: signal.latestRunId ? `/app/runs/${signal.latestRunId}` : "/app/runs" });
  if (signal.providerCount < 2) actions.push({ priority: "now", title: "Add a second answer provider", reason: "Cross-provider agreement cannot be measured from a single provider.", href: "/app/settings#providers" });
  if (signal.sourceReviewPct !== null && signal.sourceReviewPct < 80) actions.push({ priority: "next", title: "Complete the source review", reason: `${signal.sourceReviewPct}% of mapped sources have a documented page review.`, href: "/app/source-map" });
  if (signal.sourceDependencyPct !== null && signal.sourceDependencyPct >= 50) actions.push({ priority: "next", title: "Reduce source concentration risk", reason: `The top three sources account for ${signal.sourceDependencyPct}% of observed citations. Diversify credible evidence routes.`, href: "/app/opportunities" });
  if (signal.recommendationConsensusPct !== null && signal.recommendationConsensusPct < 70) actions.push({ priority: "watch", title: "Treat the latest recommendation pattern as unstable", reason: `Providers agree on brand presence for ${signal.recommendationConsensusPct}% of comparable buyer questions.`, href: "/app/runs" });
  if (!actions.length) actions.push({ priority: "next", title: "Advance the highest-evidence gap", reason: "Collection coverage, cross-provider agreement, and source review are sufficient for a controlled next action.", href: "/app/opportunities" });
  return actions.slice(0, 4);
}

export async function loadDecisionSignal(viewer: Viewer): Promise<DecisionSignal> {
  if (viewer.mode === "demo") {
    const base: Omit<DecisionSignal, "actions"> = {
      reviewedRuns: 3,
      latestRunId: demoRuns[0].id,
      latestRunDate: demoRuns[0].date,
      providerCount: 4,
      promptCount: demoRuns[0].prompts,
      answerCount: demoRuns[0].answers,
      answerCompletionPct: 100,
      recommendationConsensusPct: 68,
      presenceRange: 7,
      presenceDelta: 3,
      sourceReviewPct: 88,
      sourceDependencyPct: 57,
      recurringSourcePct: 75,
      evidenceObservations: sourceMapEntries.reduce((sum, source) => sum + source.evidenceCount, 0),
      decisionReadiness: "directional",
    };
    return { ...base, actions: buildDecisionActions(base) };
  }

  const organizationId = await getPrimaryOrganizationId(viewer);
  const empty: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: 0, latestRunId: null, latestRunDate: null, providerCount: 0, promptCount: 0, answerCount: 0,
    answerCompletionPct: null, recommendationConsensusPct: null, presenceRange: null, presenceDelta: null,
    sourceReviewPct: null, sourceDependencyPct: null, recurringSourcePct: null, evidenceObservations: 0, decisionReadiness: "insufficient",
  };
  if (!organizationId) return { ...empty, actions: buildDecisionActions(empty) };

  type DecisionRunRow = RunRow & { provider_ids: string[] };
  const [rows, sources] = await Promise.all([
    supabaseRest<DecisionRunRow[]>(`runs?select=id,status,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${organizationId}&status=eq.complete&order=created_at.desc&limit=8`, { token: viewer.accessToken }),
    loadSourceMap(viewer),
  ]);
  const latest = rows[0];
  if (!latest) return { ...empty, sourceReviewPct: sources.length ? clampPct((sources.filter((source) => source.reviewedAt).length / sources.length) * 100) : null, actions: buildDecisionActions(empty) };

  const answers = await supabaseRest<Array<{ prompt_key: string; provider: string; brand_present: boolean | null }>>(
    `run_answers?select=prompt_key,provider,brand_present&organization_id=eq.${organizationId}&run_id=eq.${latest.id}&review_status=eq.verified`,
    { token: viewer.accessToken },
  );
  const providerCount = latest.provider_ids?.length || new Set(answers.map((answer) => answer.provider)).size;
  const expectedAnswers = latest.prompt_count * providerCount;
  const promptAnswers = new Map<string, Array<boolean>>();
  answers.forEach((answer) => {
    if (answer.brand_present === null) return;
    const group = promptAnswers.get(answer.prompt_key) || [];
    group.push(answer.brand_present);
    promptAnswers.set(answer.prompt_key, group);
  });
  const comparable = Array.from(promptAnswers.values()).filter((group) => group.length >= 2);
  const agreed = comparable.filter((group) => group.every((value) => value === group[0])).length;
  const presences = rows.map((row) => Number(row.brand_presence_pct));
  const observationTotal = sources.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...sources].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const sourceReviewPct = sources.length ? clampPct((sources.filter((source) => source.reviewedAt).length / sources.length) * 100) : null;
  const signalBase: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: rows.length,
    latestRunId: latest.id,
    latestRunDate: dateLabel(latest.created_at),
    providerCount,
    promptCount: latest.prompt_count,
    answerCount: latest.answer_count,
    answerCompletionPct: expectedAnswers ? clampPct((latest.answer_count / expectedAnswers) * 100) : null,
    recommendationConsensusPct: comparable.length ? clampPct((agreed / comparable.length) * 100) : null,
    presenceRange: rows.length > 1 ? Math.round((Math.max(...presences) - Math.min(...presences)) * 10) / 10 : null,
    presenceDelta: rows.length > 1 ? Math.round((presences[0] - presences[1]) * 10) / 10 : null,
    sourceReviewPct,
    sourceDependencyPct: observationTotal ? clampPct((topThreeObservations / observationTotal) * 100) : null,
    recurringSourcePct: sources.length ? clampPct((sources.filter((source) => source.evidenceCount > 1).length / sources.length) * 100) : null,
    evidenceObservations: observationTotal,
    decisionReadiness: rows.length >= 2 && providerCount >= 2 && (sourceReviewPct ?? 0) >= 80 && (expectedAnswers ? latest.answer_count / expectedAnswers >= .9 : false) ? "ready" : rows.length && latest.answer_count ? "directional" : "insufficient",
  };
  return { ...signalBase, actions: buildDecisionActions(signalBase) };
}
