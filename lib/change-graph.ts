import type { Viewer } from "@/lib/auth";
import {
  assessChangeGraphSafety,
  type ChangeGraphSafetyAnswer,
  type ChangeGraphSafetyAssessment,
  type ChangeGraphSafetyRun,
} from "@/lib/change-graph-safety-core";
import { loadWorkspaceContext } from "@/lib/data";
import {
  buildChangeGraph,
  loadChangeGraph as loadChangeGraphEngine,
  type ChangeGraph,
  type ChangeGraphEvent,
  type ChangeGraphEventKind,
} from "@/lib/change-graph-engine";
import { supabaseRest } from "@/lib/supabase-rest";

export {
  assessChangeGraphSafety,
  buildChangeGraph,
  type ChangeGraph,
  type ChangeGraphEvent,
  type ChangeGraphEventKind,
  type ChangeGraphSafetyAnswer,
  type ChangeGraphSafetyAssessment,
  type ChangeGraphSafetyRun,
};

function withholdUnsafeMovement(graph: ChangeGraph, reason: string): ChangeGraph {
  const independentPageEvents = graph.events.filter((event) => event.kind === "source_content");
  return {
    ...graph,
    status: "not_comparable",
    comparable: false,
    events: [
      {
        id: "methodology:safety-withheld",
        kind: "methodology",
        direction: "withheld",
        title: "Cross-collection movement withheld",
        detail: `${reason} The latest collection remains valid evidence on its own, but Foremention will not label the difference as product movement.`,
        href: `/app/runs/${graph.latestRunId}`,
      },
      ...independentPageEvents,
    ],
    note: "Movement is withheld unless both collections finish review and preserve the exact buyer-question text, provider, model and methodology matrix. Saved page observations remain independent dated evidence and do not prove causation.",
  };
}

export async function loadChangeGraph(
  viewer: Viewer,
  latestRunId: string,
  previousRunId: string | null,
): Promise<ChangeGraph> {
  const graph = await loadChangeGraphEngine(viewer, latestRunId, previousRunId);
  if (graph.status !== "comparable" || !previousRunId || viewer.mode === "demo" || !viewer.accessToken) return graph;

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withholdUnsafeMovement(graph, "The active workspace context is unavailable.");

  const runIds = [latestRunId, previousRunId];
  const [runs, answers] = await Promise.all([
    supabaseRest<ChangeGraphSafetyRun[]>(
      `runs?select=id,status&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${runIds.join(",")})`,
      { token: viewer.accessToken },
    ),
    supabaseRest<ChangeGraphSafetyAnswer[]>(
      `run_answers?select=run_id,prompt_key,prompt_text,provider,model&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified`,
      { token: viewer.accessToken },
    ),
  ]);

  const assessment = assessChangeGraphSafety(latestRunId, previousRunId, runs, answers);
  return assessment.comparable ? graph : withholdUnsafeMovement(graph, assessment.reason || "The collections are not safely comparable.");
}
