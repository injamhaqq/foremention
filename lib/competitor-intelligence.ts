import type { Viewer } from "@/lib/auth";
import { loadCompetitorTracking, loadWorkspaceContext, type CompetitorTracking } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export type CompetitorComparisonPair = {
  latest: { id: string; date: string } | null;
  previous: { id: string; date: string } | null;
};

type AnswerRow = { run_id: string; answer_text: string };
type MapRow = { id: string; name: string; run_id: string | null };
type EntryRow = {
  competitors_present: string[] | null;
  client_present: boolean;
  source: { crawler_checked_at: string | null } | null;
};

const frequencyPct = (answers: AnswerRow[], normalizedName: string) => {
  if (!answers.length) return null;
  const mentions = answers.filter((answer) => answer.answer_text.toLocaleLowerCase().includes(normalizedName)).length;
  return Math.round((mentions / answers.length) * 100);
};

/**
 * Competitor customer metrics use the same exact reviewed pair selected by the
 * safe intelligence layer. This loader intentionally does not infer a trend
 * from chronological neighbors or unreviewed answers.
 *
 * Page-level competitor presence is a bounded page observation from the latest
 * reviewed Source Map. It is labelled as a checked page observation, not as a
 * human-confirmed competitor fact or market-share estimate.
 */
export async function loadSafeCompetitorTracking(
  viewer: Viewer,
  pair: CompetitorComparisonPair,
): Promise<CompetitorTracking[]> {
  if (viewer.mode === "demo") return loadCompetitorTracking(viewer);
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];

  const competitors = await supabaseRest<Array<{
    id: string;
    name: string;
    website: string | null;
    competitor_type: CompetitorTracking["type"];
    active: boolean;
  }>>(
    `competitors?select=id,name,website,competitor_type,active&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.asc&limit=100`,
    { token: viewer.accessToken },
  );
  if (!competitors.length) return [];

  const selectedRunIds = [pair.latest?.id, pair.previous?.id].filter((value): value is string => Boolean(value));
  const answers = selectedRunIds.length
    ? await supabaseRest<AnswerRow[]>(
      `run_answers?select=run_id,answer_text&organization_id=eq.${context.organizationId}&run_id=in.(${selectedRunIds.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=2000`,
      { token: viewer.accessToken },
    )
    : [];

  const latestRunId = pair.latest?.id || null;
  const maps = latestRunId
    ? await supabaseRest<MapRow[]>(
      `source_maps?select=id,name,run_id&organization_id=eq.${context.organizationId}&run_id=eq.${latestRunId}&status=eq.published&order=created_at.desc&limit=10`,
      { token: viewer.accessToken },
    )
    : [];
  const reviewedMap = maps.find((map) => map.name.startsWith("Reviewed collection")) || null;
  const entries = reviewedMap
    ? await supabaseRest<EntryRow[]>(
      `source_map_entries?select=competitors_present,client_present,source:sources(crawler_checked_at)&organization_id=eq.${context.organizationId}&source_map_id=eq.${reviewedMap.id}&limit=1000`,
      { token: viewer.accessToken },
    )
    : [];

  const latestAnswers = pair.latest ? answers.filter((answer) => answer.run_id === pair.latest!.id) : [];
  const previousAnswers = pair.previous ? answers.filter((answer) => answer.run_id === pair.previous!.id) : [];

  return competitors.map((competitor) => {
    const normalizedName = competitor.name.toLocaleLowerCase();
    const latestMentions = latestAnswers.filter((answer) => answer.answer_text.toLocaleLowerCase().includes(normalizedName)).length;
    const latestFrequency = frequencyPct(latestAnswers, normalizedName);
    const previousFrequency = frequencyPct(previousAnswers, normalizedName);
    const checkedPages = entries.filter((entry) => Boolean(entry.source?.crawler_checked_at)
      && (entry.competitors_present || []).some((name) => name.toLocaleLowerCase() === normalizedName));
    const trendPoints = [
      ...(pair.previous && previousFrequency !== null ? [{ runId: pair.previous.id, date: pair.previous.date, frequencyPct: previousFrequency }] : []),
      ...(pair.latest && latestFrequency !== null ? [{ runId: pair.latest.id, date: pair.latest.date, frequencyPct: latestFrequency }] : []),
    ];

    return {
      id: competitor.id,
      name: competitor.name,
      website: competitor.website,
      type: competitor.competitor_type,
      active: competitor.active,
      answerMentions: latestMentions,
      totalAnswers: latestAnswers.length,
      mentionFrequencyPct: latestFrequency,
      reviewedCitationPages: checkedPages.length,
      sourceOverlap: checkedPages.filter((entry) => entry.client_present).length,
      trendPoints,
      trendDelta: latestFrequency !== null && previousFrequency !== null ? latestFrequency - previousFrequency : null,
    };
  });
}
