import type { Viewer } from "@/lib/auth";
import {
  loadCompetitorTracking,
  loadDecisionSignal,
  loadQuestionPerformance,
  loadWorkspaceContext,
  type CompetitorTracking,
  type DecisionSignal,
  type QuestionPerformance,
} from "@/lib/data";
import { sourceMapEntries } from "@/lib/demo-data";
import { supabaseRest } from "@/lib/supabase-rest";
import type { EntryRoute, SourceMapEntry } from "@/lib/types";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

const sourceRoute = (value: string | null): SourceMapEntry["route"] => {
  const allowed: EntryRoute[] = [
    "editorial outreach",
    "comparison inclusion",
    "expert contribution",
    "original research",
    "legitimate review",
    "community participation",
  ];
  return allowed.includes(value as EntryRoute) ? value as EntryRoute : "unknown";
};

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

type TruthfulSourceEntryRow = {
  id: string;
  source_id: string;
  rank: number;
  citation_observations: number;
  engines: SourceMapEntry["engines"];
  client_present: boolean;
  competitors_present: string[];
  entry_route: string | null;
  feasibility: SourceMapEntry["feasibility"];
  influence: SourceMapEntry["influence"];
  reviewed_at: string | null;
  reviewed_by: string | null;
  source: {
    domain: string;
    page_title: string | null;
    canonical_url: string;
    source_type: string | null;
    crawler_access: SourceMapEntry["crawlerAccess"];
    crawler_checked_at: string | null;
  } | null;
};

/**
 * Customer-facing source truth. Automated retrieval facts live on `sources`;
 * explicit human review provenance lives on `source_map_entries`.
 *
 * `runId` pins consumers such as Analytics/Decision Lab to the Source Map
 * produced by the exact measurement run instead of silently mixing evidence
 * from a newer or failed collection.
 */
export async function loadTruthfulSourceMap(
  viewer: Viewer,
  options: { runId?: string | null } = {},
): Promise<SourceMapEntry[]> {
  if (viewer.mode === "demo") return sourceMapEntries;
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const runFilter = options.runId ? `&run_id=eq.${encodeURIComponent(options.runId)}` : "";
  const maps = await supabaseRest<Array<{ id: string; run_id: string | null }>>(
    `source_maps?select=id,run_id&organization_id=eq.${context.organizationId}&category_id=eq.${context.categoryId}${runFilter}&status=eq.published&order=created_at.desc&limit=1`,
    { token: viewer.accessToken },
  );
  if (!maps[0]) return [];
  const rows = await supabaseRest<TruthfulSourceEntryRow[]>(
    `source_map_entries?select=id,source_id,rank,citation_observations,engines,client_present,competitors_present,entry_route,feasibility,influence,reviewed_at,reviewed_by,source:sources(domain,page_title,canonical_url,source_type,crawler_access,crawler_checked_at)&source_map_id=eq.${maps[0].id}&organization_id=eq.${context.organizationId}&order=rank.asc`,
    { token: viewer.accessToken },
  );
  return rows.filter((row) => row.source).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    rank: row.rank,
    domain: row.source!.domain,
    title: row.source!.page_title || row.source!.domain,
    url: row.source!.canonical_url,
    type: row.source!.source_type || "web source",
    influence: row.influence,
    engines: row.engines || [],
    clientPresent: row.client_present,
    competitors: row.competitors_present || [],
    crawlerAccess: row.source!.crawler_access,
    route: sourceRoute(row.entry_route),
    feasibility: row.feasibility,
    evidenceCount: row.citation_observations,
    reviewedAt: row.reviewed_at ? dateLabel(row.reviewed_at) : null,
  }));
}

const mentionFrequency = (answers: Array<{ answer_text: string }>, name: string) => {
  const normalizedName = name.toLocaleLowerCase();
  const mentions = answers.filter((answer) => answer.answer_text.toLocaleLowerCase().includes(normalizedName)).length;
  return { mentions, frequencyPct: answers.length ? Math.round((mentions / answers.length) * 100) : 0 };
};

/**
 * Competitor observations use finalized collections and verified answers only.
 * A delta is emitted only for the exact safe pair supplied by
 * `loadSafeWeeklyIntelligence`; arbitrary adjacent runs never become a trend.
 */
export async function loadTruthfulCompetitorTracking(
  viewer: Viewer,
  comparablePair: { latestId: string; previousId: string } | null,
): Promise<CompetitorTracking[]> {
  if (viewer.mode === "demo") return loadCompetitorTracking(viewer);
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const [competitors, runs, entries] = await Promise.all([
    supabaseRest<Array<{ id: string; name: string; website: string | null; competitor_type: CompetitorTracking["type"]; active: boolean }>>(
      `competitors?select=id,name,website,competitor_type,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.asc&limit=100`,
      { token: viewer.accessToken },
    ),
    supabaseRest<Array<{ id: string; created_at: string }>>(
      `runs?select=id,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(complete,partial)&order=created_at.asc&limit=50`,
      { token: viewer.accessToken },
    ),
    loadTruthfulSourceMap(viewer),
  ]);
  const runIds = runs.map((run) => run.id);
  const answers = runIds.length ? await supabaseRest<Array<{ run_id: string; answer_text: string }>>(
    `run_answers?select=run_id,answer_text&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=2000`,
    { token: viewer.accessToken },
  ) : [];

  return competitors.map((competitor) => {
    const total = mentionFrequency(answers, competitor.name);
    const trendPoints = runs.map((run) => {
      const runAnswers = answers.filter((answer) => answer.run_id === run.id);
      const point = mentionFrequency(runAnswers, competitor.name);
      return { runId: run.id, date: dateLabel(run.created_at), frequencyPct: point.frequencyPct };
    });
    const reviewedPages = entries.filter((entry) => Boolean(entry.reviewedAt) && entry.competitors.some((name) => name.toLocaleLowerCase() === competitor.name.toLocaleLowerCase()));
    let trendDelta: number | null = null;
    if (comparablePair) {
      const latestPoint = trendPoints.find((point) => point.runId === comparablePair.latestId);
      const previousPoint = trendPoints.find((point) => point.runId === comparablePair.previousId);
      if (latestPoint && previousPoint) trendDelta = latestPoint.frequencyPct - previousPoint.frequencyPct;
    }
    return {
      id: competitor.id,
      name: competitor.name,
      website: competitor.website,
      type: competitor.competitor_type,
      active: competitor.active,
      answerMentions: total.mentions,
      totalAnswers: answers.length,
      mentionFrequencyPct: answers.length ? total.frequencyPct : null,
      reviewedCitationPages: reviewedPages.length,
      sourceOverlap: reviewedPages.filter((entry) => entry.clientPresent).length,
      trendPoints,
      trendDelta,
    };
  });
}

function buildDecisionActions(signal: Omit<DecisionSignal, "actions">): DecisionSignal["actions"] {
  const actions: DecisionSignal["actions"] = [];
  if (signal.reviewedRuns < 2) actions.push({ priority: "now", title: "Establish a repeatable baseline", reason: "One finalized reviewed run cannot establish comparable movement.", href: "/app/runs" });
  if (signal.answerCompletionPct !== null && signal.answerCompletionPct < 90) actions.push({ priority: "now", title: "Repair collection coverage", reason: `${signal.answerCompletionPct}% of the expected answer matrix is verified. Diagnose failed or excluded prompt-provider combinations before acting.`, href: signal.latestRunId ? `/app/runs/${signal.latestRunId}` : "/app/runs" });
  if (signal.providerCount < 2) actions.push({ priority: "now", title: "Add a second answer provider", reason: "Cross-provider agreement cannot be measured from a single provider.", href: "/app/settings#providers" });
  if (signal.sourceReviewPct !== null && signal.sourceReviewPct < 80) actions.push({ priority: "next", title: "Complete the source review", reason: `${signal.sourceReviewPct}% of mapped sources have an explicit human review.`, href: "/app/source-map" });
  if (signal.sourceDependencyPct !== null && signal.sourceDependencyPct >= 50) actions.push({ priority: "next", title: "Reduce source concentration risk", reason: `The top three sources account for ${signal.sourceDependencyPct}% of observed citations. Diversify credible evidence routes.`, href: "/app/opportunities" });
  if (signal.recommendationConsensusPct !== null && signal.recommendationConsensusPct < 70) actions.push({ priority: "watch", title: "Treat the latest recommendation pattern as unstable", reason: `Providers agree on brand presence for ${signal.recommendationConsensusPct}% of comparable buyer questions in the latest finalized run.`, href: "/app/runs" });
  if (!actions.length) actions.push({ priority: "next", title: "Advance the highest-evidence gap", reason: "Latest-run coverage, provider agreement, and explicit source review are sufficient for a controlled next action; movement still requires an exact comparable pair.", href: "/app/opportunities" });
  return actions.slice(0, 4);
}

/**
 * Decision Lab readiness is computed from one finalized run at a time. It never
 * mixes answers from different collections, and it never treats `review` as a
 * completed measurement. Exact run-to-run movement is supplied separately by
 * the safe intelligence comparator at the page boundary.
 */
export async function loadTruthfulDecisionSignal(viewer: Viewer): Promise<DecisionSignal> {
  if (viewer.mode === "demo") return loadDecisionSignal(viewer);
  const context = await loadWorkspaceContext(viewer);
  const empty: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: 0,
    latestRunId: null,
    latestRunDate: null,
    providerCount: 0,
    promptCount: 0,
    answerCount: 0,
    answerCompletionPct: null,
    recommendationConsensusPct: null,
    presenceRange: null,
    presenceDelta: null,
    sourceReviewPct: null,
    sourceDependencyPct: null,
    recurringSourcePct: null,
    evidenceObservations: 0,
    decisionReadiness: "insufficient",
  };
  if (!context) return { ...empty, actions: buildDecisionActions(empty) };
  const runs = await supabaseRest<Array<{ id: string; provider_ids: string[]; prompt_count: number; created_at: string }>>(
    `runs?select=id,provider_ids,prompt_count,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(complete,partial)&order=created_at.desc&limit=8`,
    { token: viewer.accessToken },
  );
  const latest = runs[0];
  if (!latest) return { ...empty, actions: buildDecisionActions(empty) };
  const [answers, sources] = await Promise.all([
    supabaseRest<Array<{ prompt_key: string; prompt_text: string | null; provider: string; brand_present: boolean | null }>>(
      `run_answers?select=prompt_key,prompt_text,provider,brand_present&organization_id=eq.${context.organizationId}&run_id=eq.${latest.id}&review_status=eq.verified&order=collected_at.asc`,
      { token: viewer.accessToken },
    ),
    loadTruthfulSourceMap(viewer, { runId: latest.id }),
  ]);
  const expectedAnswers = Math.max(1, latest.prompt_count) * Math.max(1, latest.provider_ids.length);
  const promptAnswers = new Map<string, boolean[]>();
  for (const answer of answers) {
    if (answer.brand_present === null) continue;
    const key = JSON.stringify([answer.prompt_key, answer.prompt_text || answer.prompt_key]);
    promptAnswers.set(key, [...(promptAnswers.get(key) || []), answer.brand_present]);
  }
  const comparable = Array.from(promptAnswers.values()).filter((group) => group.length >= 2);
  const agreed = comparable.filter((group) => group.every((value) => value === group[0])).length;
  const observationTotal = sources.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...sources].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const sourceReviewPct = sources.length ? clampPct((sources.filter((source) => source.reviewedAt).length / sources.length) * 100) : null;
  const signalBase: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: runs.length,
    latestRunId: latest.id,
    latestRunDate: dateLabel(latest.created_at),
    providerCount: latest.provider_ids.length,
    promptCount: latest.prompt_count,
    answerCount: answers.length,
    answerCompletionPct: clampPct((answers.length / expectedAnswers) * 100),
    recommendationConsensusPct: comparable.length ? clampPct((agreed / comparable.length) * 100) : null,
    presenceRange: null,
    presenceDelta: null,
    sourceReviewPct,
    sourceDependencyPct: observationTotal ? clampPct((topThreeObservations / observationTotal) * 100) : null,
    recurringSourcePct: sources.length ? clampPct((sources.filter((source) => source.evidenceCount > 1).length / sources.length) * 100) : null,
    evidenceObservations: observationTotal,
    decisionReadiness: answers.length ? "directional" : "insufficient",
  };
  return { ...signalBase, actions: buildDecisionActions(signalBase) };
}

/** Keep edited buyer-question wording as a separate measurement identity. */
export async function loadExactQuestionPerformance(viewer: Viewer): Promise<QuestionPerformance[]> {
  if (viewer.mode === "demo") return loadQuestionPerformance(viewer);
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const rows = await supabaseRest<Array<{ run_id: string; prompt_key: string; prompt_text: string | null; answer_text: string; citations_json: Array<{ url?: string }> | null }>>(
    `run_answers?select=run_id,prompt_key,prompt_text,answer_text,citations_json&organization_id=eq.${context.organizationId}&review_status=eq.verified&order=collected_at.asc&limit=2000`,
    { token: viewer.accessToken },
  );
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const identity = JSON.stringify([row.prompt_key, row.prompt_text || row.prompt_key]);
    groups.set(identity, [...(groups.get(identity) || []), row]);
  }
  return Array.from(groups.entries()).map(([identity, answers]) => {
    const citationCount = answers.reduce((sum, answer) => sum + (answer.citations_json || []).filter((citation) => Boolean(citation.url)).length, 0);
    const citedAnswers = answers.filter((answer) => (answer.citations_json || []).some((citation) => Boolean(citation.url))).length;
    const brandMentionCount = answers.filter((answer) => answer.answer_text.toLocaleLowerCase().includes(context.organizationName.toLocaleLowerCase())).length;
    const runCount = new Set(answers.map((answer) => answer.run_id)).size;
    const guidance: QuestionPerformance["guidance"] = runCount < 2 ? "Needs repeat" : citationCount >= answers.length && brandMentionCount > 0 ? "High evidence yield" : citationCount > 0 ? "Keep as baseline" : "Low observed yield";
    return {
      key: identity,
      question: answers[0]?.prompt_text || answers[0]?.prompt_key || "Buyer question",
      answerCount: answers.length,
      runCount,
      citationCount,
      citedAnswerPct: answers.length ? Math.round((citedAnswers / answers.length) * 100) : 0,
      brandMentionCount,
      guidance,
    };
  }).sort((left, right) => right.citationCount - left.citationCount || right.brandMentionCount - left.brandMentionCount || left.question.localeCompare(right.question));
}
