import type { Viewer } from "@/lib/auth";
import { buildAiObservationChangeGraph, fictionalAiObservationChangeGraph, type AiObservationChangeGraph } from "@/lib/ai-observation-change-core";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import { assessWorkspaceRunPairComparability } from "@/lib/run-pair-comparability";
import { supabaseRest } from "@/lib/supabase-rest";

export type { AiObservationChangeGraph } from "@/lib/ai-observation-change-core";

type RunRow = { id: string; project_id: string | null; methodology_version: string | null };
type SourceMapRow = { id: string; run_id: string | null; name: string };
type SourceMapEntryRow = { source_map_id: string; competitors_present: string[] | null };

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

export async function loadAiObservationChangeGraph(
  viewer: Viewer,
  latestRunId: string,
  previousRunId: string | null,
): Promise<AiObservationChangeGraph> {
  if (viewer.mode === "demo") return fictionalAiObservationChangeGraph(latestRunId, previousRunId);
  if (!viewer.accessToken) return withheld(latestRunId, previousRunId, "A signed-in workspace session is required before AI observations can be compared.");

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withheld(latestRunId, previousRunId, "A configured workspace project is required before AI observations can be compared.");

  let effectivePreviousRunId = previousRunId;
  let diagnosticOnly = false;
  let runs: RunRow[];

  if (!effectivePreviousRunId) {
    runs = await supabaseRest<RunRow[]>(
      `runs?select=id,project_id,methodology_version&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(complete,partial)&order=created_at.desc&limit=20`,
      { token: viewer.accessToken },
    );
    const latest = runs.find((run) => run.id === latestRunId);
    const nearestReviewedPrior = runs.find((run) => run.id !== latestRunId) || null;
    if (!latest) return withheld(latestRunId, null, "The latest reviewed baseline could not be verified inside the active workspace project.");
    if (!nearestReviewedPrior) {
      return buildAiObservationChangeGraph({
        latest: { id: latest.id, methodologyVersion: latest.methodology_version },
        previous: null,
        answers: [],
      });
    }
    // Diagnostic-only invariant: this fallback may explain why comparison was withheld,
    // but it can never promote the nearest chronological run into customer movement.
    effectivePreviousRunId = nearestReviewedPrior.id;
    diagnosticOnly = true;
    runs = [latest, nearestReviewedPrior];
  } else {
    const requested = [latestRunId, effectivePreviousRunId];
    runs = await supabaseRest<RunRow[]>(
      `runs?select=id,project_id,methodology_version&organization_id=eq.${context.organizationId}&id=in.(${requested.join(",")})`,
      { token: viewer.accessToken },
    );
  }

  const runById = new Map(runs.map((run) => [run.id, run]));
  const latest = runById.get(latestRunId);
  const previous = effectivePreviousRunId ? runById.get(effectivePreviousRunId) : null;
  if (!latest || !previous || latest.project_id !== context.projectId || previous.project_id !== context.projectId) {
    return withheld(latestRunId, effectivePreviousRunId, "The selected reviewed collections are not both inside the active workspace project, so movement is withheld.");
  }
  const requested = [latestRunId, previous.id];
  const comparison = await assessWorkspaceRunPairComparability(viewer, previous.id, latestRunId);
  if (!comparison.comparable) {
    return withheld(
      latestRunId,
      previous.id,
      comparison.reason || "The complete reviewed answer sets are not exactly comparable.",
    );
  }
  const answers = comparison.answers;

  let competitors: Array<{ runId: string; names: string[] }> = [];
  let competitorContextComparable = false;
  if (!diagnosticOnly) {
    const maps = await supabaseRest<SourceMapRow[]>(
      `source_maps?select=id,run_id,name&organization_id=eq.${context.organizationId}&run_id=in.(${requested.join(",")})&status=eq.published&limit=5`,
      { token: viewer.accessToken },
    );
    const reviewedMaps = maps.filter((map) => map.run_id && map.name.startsWith("Reviewed collection"));
    const latestMaps = reviewedMaps.filter((map) => map.run_id === latestRunId);
    const previousMaps = reviewedMaps.filter((map) => map.run_id === previous.id);
    const latestMapId = latestMaps.length === 1 ? latestMaps[0].id : null;
    const previousMapId = previousMaps.length === 1 ? previousMaps[0].id : null;
    competitorContextComparable = Boolean(latestMapId && previousMapId);
    const mapIds = [latestMapId, previousMapId].filter((value): value is string => Boolean(value));
    const candidateEntries = mapIds.length
      ? await supabaseRest<SourceMapEntryRow[]>(
        `source_map_entries?select=source_map_id,competitors_present&organization_id=eq.${context.organizationId}&source_map_id=in.(${mapIds.join(",")})&limit=501`,
        { token: viewer.accessToken },
      )
      : [];
    const entries = candidateEntries.length <= 500 ? candidateEntries : [];
    competitorContextComparable = competitorContextComparable && candidateEntries.length <= 500;
    const runByMap = new Map(reviewedMaps.map((map) => [map.id, map.run_id!]));
    competitors = entries.flatMap((entry) => {
      const runId = runByMap.get(entry.source_map_id);
      return runId ? [{ runId, names: entry.competitors_present || [] }] : [];
    });
  }

  const graph = buildAiObservationChangeGraph({
    latest: { id: latest.id, methodologyVersion: latest.methodology_version },
    previous: { id: previous.id, methodologyVersion: previous.methodology_version },
    answers: answers.map((answer) => ({
      runId: answer.runId,
      promptKey: answer.promptKey,
      prompt: answer.promptText,
      provider: answer.provider,
      model: answer.model,
      measurementContext: answer.measurementContext,
      answerText: answer.answerText,
      brandPresent: answer.brandPresent,
      citationUrls: Array.from(new Set(answer.citations.flatMap((citation) => {
        const canonical = canonicalCitation(citation.url);
        return canonical ? [canonical] : [];
      }))),
    })),
    competitors,
    competitorContextComparable,
  });

  if (!diagnosticOnly) return graph;
  if (graph.status === "withheld") {
    return {
      ...graph,
      previousRunId: previous.id,
      note: `Nearest prior reviewed-run diagnostic: ${graph.note} No delta is inferred from this non-comparable pair.`,
    };
  }
  return withheld(
    latestRunId,
    previous.id,
    "A prior reviewed run exists, but Safe Intelligence did not select it as the exact comparison pair. The fallback run is shown only as a comparability diagnostic; it is never used to create customer movement.",
  );
}
