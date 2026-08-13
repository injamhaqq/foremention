import type { Viewer } from "@/lib/auth";
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
  buildChangeGraph,
  type ChangeGraph,
  type ChangeGraphEvent,
  type ChangeGraphEventKind,
} from "@/lib/change-graph-engine";

type SafetyRun = {
  id: string;
  status: string;
};

type SafetyAnswer = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
};

export type ChangeGraphSafetyAssessment = {
  comparable: boolean;
  reason: string | null;
};

const reviewedTerminalStatuses = new Set(["complete", "partial"]);
const normalizedQuestion = (value: string) => value.replace(/\s+/g, " ").trim();

function answerIdentity(answer: SafetyAnswer) {
  return [
    answer.prompt_key,
    normalizedQuestion(answer.prompt_text || ""),
    answer.provider,
    answer.model || "model-not-recorded",
  ].join("\u0000");
}

/**
 * Final customer-facing comparability gate.
 *
 * The underlying Change Graph engine already requires matching methodology,
 * provider/model slots and tenant/project scope. This guard additionally
 * refuses movement until both collections are in reviewed terminal states and
 * the exact persisted buyer-question text matches in every verified answer
 * slot. A stable prompt key alone is not enough proof that the question itself
 * stayed unchanged.
 */
export function assessChangeGraphSafety(
  latestRunId: string,
  previousRunId: string | null,
  runs: SafetyRun[],
  answers: SafetyAnswer[],
): ChangeGraphSafetyAssessment {
  if (!previousRunId) return { comparable: false, reason: "A second reviewed collection is required." };

  const runById = new Map(runs.map((run) => [run.id, run]));
  const latestRun = runById.get(latestRunId);
  const previousRun = runById.get(previousRunId);
  if (!latestRun || !previousRun) {
    return { comparable: false, reason: "Both collection records must be available in the active workspace." };
  }
  if (!reviewedTerminalStatuses.has(latestRun.status) || !reviewedTerminalStatuses.has(previousRun.status)) {
    return { comparable: false, reason: "Both collections must finish human review before movement is reported." };
  }

  const scoped = answers.filter((answer) => answer.run_id === latestRunId || answer.run_id === previousRunId);
  if (scoped.some((answer) => !answer.prompt_text || !normalizedQuestion(answer.prompt_text))) {
    return { comparable: false, reason: "Exact buyer-question text is missing from at least one reviewed answer." };
  }
  if (scoped.some((answer) => !answer.model)) {
    return { comparable: false, reason: "Exact model provenance is missing from at least one reviewed answer." };
  }

  const latestKeys = scoped.filter((answer) => answer.run_id === latestRunId).map(answerIdentity).sort();
  const previousKeys = scoped.filter((answer) => answer.run_id === previousRunId).map(answerIdentity).sort();
  if (!latestKeys.length || latestKeys.length !== previousKeys.length || latestKeys.some((key, index) => key !== previousKeys[index])) {
    return { comparable: false, reason: "The exact reviewed buyer-question/provider/model matrix changed between collections." };
  }

  return { comparable: true, reason: null };
}

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
    supabaseRest<SafetyRun[]>(
      `runs?select=id,status&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${runIds.join(",")})`,
      { token: viewer.accessToken },
    ),
    supabaseRest<SafetyAnswer[]>(
      `run_answers?select=run_id,prompt_key,prompt_text,provider,model&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified`,
      { token: viewer.accessToken },
    ),
  ]);

  const assessment = assessChangeGraphSafety(latestRunId, previousRunId, runs, answers);
  return assessment.comparable ? graph : withholdUnsafeMovement(graph, assessment.reason || "The collections are not safely comparable.");
}
