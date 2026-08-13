import type { Viewer } from "@/lib/auth";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import {
  buildRunChangeGraph,
  EMPTY_RUN_CHANGE_SUMMARY,
  fictionalRunChangeGraph,
  type RunChangeGraph,
} from "@/lib/run-change-graph-core";
import { supabaseRest } from "@/lib/supabase-rest";

export { buildRunChangeGraph, fictionalRunChangeGraph, type RunChangeGraph } from "@/lib/run-change-graph-core";

type RunRow = { id: string; methodology_version: string | null; project_id: string | null };
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

function canonicalCitation(value: string) {
  try { return canonicalizeEvidenceUrl(value); }
  catch { return null; }
}

function withheldGraph(latestRunId: string, previousRunId: string | null, detail: string): RunChangeGraph {
  return {
    status: "not_comparable",
    comparable: false,
    latestRunId,
    previousRunId,
    methodology: { latest: null, previous: null },
    answerMatrix: { latest: 0, previous: 0, missingExactModels: 0 },
    summary: { ...EMPTY_RUN_CHANGE_SUMMARY },
    events: [{ id: "scope-withheld", kind: "methodology", direction: "withheld", title: "Cross-collection movement withheld", detail }],
    note: "Run Change Graph never compares observations across workspace projects or outside the signed-in tenant.",
  };
}

export async function loadRunChangeGraph(
  viewer: Viewer,
  latestRunId: string,
  previousRunId: string | null,
): Promise<RunChangeGraph> {
  if (viewer.mode === "demo") return fictionalRunChangeGraph(latestRunId, previousRunId);
  if (!viewer.accessToken) return withheldGraph(latestRunId, previousRunId, "A signed-in workspace session is required before collection movement can be compared.");

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withheldGraph(latestRunId, previousRunId, "A configured workspace project is required before collection movement can be compared.");

  const requestedRunIds = [latestRunId, previousRunId].filter((value): value is string => Boolean(value));
  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,methodology_version,project_id&organization_id=eq.${context.organizationId}&id=in.(${requestedRunIds.join(",")})`,
    { token: viewer.accessToken },
  );
  const runById = new Map(runs.map((run) => [run.id, run]));
  const latest = runById.get(latestRunId);
  const previous = previousRunId ? runById.get(previousRunId) || null : null;
  if (!latest || latest.project_id !== context.projectId || (previous && previous.project_id !== context.projectId)) {
    return withheldGraph(latestRunId, previousRunId, "The requested collections are not both inside the active workspace project.");
  }

  const answers = await supabaseRest<AnswerRow[]>(
    `run_answers?select=run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,brand_present&organization_id=eq.${context.organizationId}&run_id=in.(${requestedRunIds.join(",")})&review_status=eq.verified`,
    { token: viewer.accessToken },
  );

  const maps = await supabaseRest<SourceMapRow[]>(
    `source_maps?select=id,run_id,name&organization_id=eq.${context.organizationId}&run_id=in.(${requestedRunIds.join(",")})&status=eq.published`,
    { token: viewer.accessToken },
  );
  const reviewedMaps = maps.filter((map) => map.run_id && map.name.startsWith("Reviewed collection"));
  const mapIds = reviewedMaps.map((map) => map.id);
  const entries = mapIds.length
    ? await supabaseRest<SourceMapEntryRow[]>(
      `source_map_entries?select=source_map_id,competitors_present&organization_id=eq.${context.organizationId}&source_map_id=in.(${mapIds.join(",")})`,
      { token: viewer.accessToken },
    )
    : [];
  const runByMapId = new Map(reviewedMaps.map((map) => [map.id, map.run_id!]));
  const competitorFacts = entries.flatMap((entry) => {
    const runId = runByMapId.get(entry.source_map_id);
    return runId ? [{ runId, names: entry.competitors_present || [] }] : [];
  });

  return buildRunChangeGraph({
    latest: { id: latest.id, methodologyVersion: latest.methodology_version },
    previous: previous ? { id: previous.id, methodologyVersion: previous.methodology_version } : null,
    answers: answers.map((answer) => ({
      runId: answer.run_id,
      promptKey: answer.prompt_key,
      prompt: answer.prompt_text || answer.prompt_key,
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
    competitors: competitorFacts,
  });
}
