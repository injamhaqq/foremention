import type { Viewer } from "@/lib/auth";
import { buildAiObservationChangeGraph, fictionalAiObservationChangeGraph, type AiObservationChangeGraph } from "@/lib/ai-observation-change-core";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export type { AiObservationChangeGraph } from "@/lib/ai-observation-change-core";

type RunRow = { id: string; project_id: string | null; status: string; methodology_version: string | null };
type AnswerRow = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string }> | null;
  brand_present: boolean | null;
};
type SourceMapRow = { id: string; run_id: string | null; name: string };
type SourceMapEntryRow = { source_map_id: string; competitors_present: string[] | null };

const reviewedTerminalStatuses = new Set(["complete", "partial"]);

function canonicalCitation(value: string) {
  return canonicalizeEvidenceUrl(value);
}

function withheld(latestRunId: string, previousRunId: string | null, note: string): AiObservationChangeGraph {
  return {
    status: "withheld",
    comparable: false,
    latestRunId,
    previousRunId,
    summary: {
      brandGains: 0,
      brandLosses: 0,
      citationGains: 0,
      citationLosses: 0,
      sourceGains: 0,
      sourceLosses: 0,
      competitorGains: 0,
      competitorLosses: 0,
      answerContextChanges: 0,
    },
    coverage: { competitorContext: "unavailable" },
    events: [],
    note,
  };
}

/**
 * Loads observation differences only for the exact pair already selected by
 * the customer-safe intelligence path. The core still rechecks exact question
 * text, provider, model and methodology so this layer cannot accidentally turn
 * a reused prompt key or stale URL parameter into a trend.
 */
export async function loadAiObservationChangeGraph(
  viewer: Viewer,
  latestRunId: string,
  previousRunId: string | null,
): Promise<AiObservationChangeGraph> {
  if (viewer.mode === "demo") return fictionalAiObservationChangeGraph(latestRunId, previousRunId);
  if (!viewer.accessToken) return withheld(latestRunId, previousRunId, "A signed-in workspace session is required before AI observations can be compared.");
  if (!previousRunId) {
    return buildAiObservationChangeGraph({ latest: { id: latestRunId, methodologyVersion: null }, previous: null, answers: [] });
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withheld(latestRunId, previousRunId, "A configured workspace project is required before AI observations can be compared.");
  const requested = [latestRunId, previousRunId];
  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,project_id,status,methodology_version&organization_id=eq.${context.organizationId}&id=in.(${requested.join(",")})`,
    { token: viewer.accessToken },
  );
  const runById = new Map(runs.map((run) => [run.id, run]));
  const latest = runById.get(latestRunId);
  const previous = runById.get(previousRunId);
  if (!latest || !previous || latest.project_id !== context.projectId || previous.project_id !== context.projectId) {
    return withheld(latestRunId, previousRunId, "The selected reviewed collections are not both inside the active workspace project, so movement is withheld.");
  }
  if (!reviewedTerminalStatuses.has(latest.status) || !reviewedTerminalStatuses.has(previous.status)) {
    return withheld(latestRunId, previousRunId, "Both collections must finish human review before AI-observation movement is reported.");
  }

  const [answers, maps] = await Promise.all([
    supabaseRest<AnswerRow[]>(
      `run_answers?select=run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,brand_present&organization_id=eq.${context.organizationId}&run_id=in.(${requested.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=500`,
      { token: viewer.accessToken },
    ),
    supabaseRest<SourceMapRow[]>(
      `source_maps?select=id,run_id,name&organization_id=eq.${context.organizationId}&run_id=in.(${requested.join(",")})&status=eq.published`,
      { token: viewer.accessToken },
    ),
  ]);

  const reviewedMaps = maps.filter((map) => map.run_id && map.name.startsWith("Reviewed collection"));
  const mapByRun = new Map(reviewedMaps.map((map) => [map.run_id!, map.id]));
  const latestMapId = mapByRun.get(latestRunId) || null;
  const previousMapId = mapByRun.get(previousRunId) || null;
  const competitorContextComparable = Boolean(latestMapId && previousMapId);
  const mapIds = [latestMapId, previousMapId].filter((value): value is string => Boolean(value));
  const entries = mapIds.length
    ? await supabaseRest<SourceMapEntryRow[]>(
      `source_map_entries?select=source_map_id,competitors_present&organization_id=eq.${context.organizationId}&source_map_id=in.(${mapIds.join(",")})`,
      { token: viewer.accessToken },
    )
    : [];
  const runByMap = new Map(reviewedMaps.map((map) => [map.id, map.run_id!]));
  const competitors = entries.flatMap((entry) => {
    const runId = runByMap.get(entry.source_map_id);
    return runId ? [{ runId, names: entry.competitors_present || [] }] : [];
  });

  return buildAiObservationChangeGraph({
    latest: { id: latest.id, methodologyVersion: latest.methodology_version },
    previous: { id: previous.id, methodologyVersion: previous.methodology_version },
    answers: answers.map((answer) => ({
      runId: answer.run_id,
      promptKey: answer.prompt_key,
      promptText: answer.prompt_text,
      provider: answer.provider,
      model: answer.model,
      answerText: answer.answer_text,
      brandPresent: answer.brand_present,
      citationUrls: Array.from(new Set((answer.citations_json || []).flatMap((citation) => {
        if (!citation.url) return [];
        const canonical = canonicalCitation(citation.url);
        return canonical ? [canonical] : [];
      }))),
    })),
    competitors,
    competitorContextComparable,
  });
}
