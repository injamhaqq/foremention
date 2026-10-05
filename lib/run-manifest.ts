import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { CURRENT_OBSERVATION_METHODOLOGY } from "@/lib/methodology-registry";
import { supabaseRest } from "@/lib/supabase-rest";

export type MeasurementSurfaceKind = "search-backed-provider-api" | "provider-api" | "fictional-demo";

export type RunManifestQuestion = {
  promptId: string | null;
  promptKey: string;
  text: string;
  locale: string;
  market: string | null;
};

export type RunManifestSurface = {
  provider: string;
  kind: MeasurementSurfaceKind;
  label: string;
  consumerInterfaceEquivalent: false;
};

export type RunManifest = {
  runId: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  brand: string;
  status: string;
  methodologyVersion: string;
  methodologyName: string;
  surfaces: RunManifestSurface[];
  providerIds: string[];
  modelIds: string[];
  questions: RunManifestQuestion[];
  plannedObservations: number;
  completedObservations: number;
  failedObservations: number;
  excludedObservations: number;
  missingObservations: number;
  requestedUnits: number;
  estimatedMaximumCostUsd: number;
  actualCostUsd: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  versions: {
    prompt: string | null;
    parser: string | null;
    retrieval: string | null;
    policy: string | null;
    schema: string | null;
    evaluation: string | null;
  };
};

type RunRow = {
  id: string;
  organization_id: string;
  project_id: string;
  status: string;
  provider_ids: string[];
  prompt_count: number;
  requested_units: number;
  estimated_max_cost_usd: number | string;
  actual_cost_usd: number | string;
  methodology_version: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type SelectionRow = {
  prompt_id: string | null;
  prompt_key: string;
  prompt_text: string;
  locale: string;
  market: string | null;
};

type AttemptRow = {
  prompt_key: string;
  provider: string;
  model: string | null;
  status: string;
  attempt_number: number;
};

type AnswerContext = {
  promptVersion?: unknown;
  parserVersion?: unknown;
  retrievalVersion?: unknown;
  policyVersion?: unknown;
  schemaVersion?: unknown;
  evaluationVersion?: unknown;
};

type AnswerRow = {
  prompt_key: string;
  provider: string;
  model: string | null;
  measurement_context_json: AnswerContext | null;
};

const SEARCH_BACKED_PROVIDERS = new Set([
  "openai",
  "gemini",
  "anthropic",
  "perplexity",
  "groq",
  "cloudflare",
]);

function surfaceFor(provider: string): RunManifestSurface {
  if (provider === "mock") {
    return {
      provider,
      kind: "fictional-demo",
      label: "Fictional demo adapter",
      consumerInterfaceEquivalent: false,
    };
  }
  if (SEARCH_BACKED_PROVIDERS.has(provider)) {
    return {
      provider,
      kind: "search-backed-provider-api",
      label: "Search-backed provider API",
      consumerInterfaceEquivalent: false,
    };
  }
  return {
    provider,
    kind: "provider-api",
    label: "Provider / gateway API",
    consumerInterfaceEquivalent: false,
  };
}

function oneVersion(rows: AnswerRow[], key: keyof AnswerContext) {
  const values = Array.from(new Set(rows.flatMap((row) => {
    const value = row.measurement_context_json?.[key];
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  })));
  return values.length === 1 ? values[0] : values.length > 1 ? "mixed" : null;
}

function terminalObservationCounts(attempts: AttemptRow[], answers: AnswerRow[], planned: number) {
  const slots = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const key = `${attempt.prompt_key}\u0000${attempt.provider}`;
    slots.set(key, [...(slots.get(key) || []), attempt]);
  }
  const completedAnswerSlots = new Set(answers.map((answer) => `${answer.prompt_key}\u0000${answer.provider}`));
  let failed = 0;
  let excluded = 0;
  for (const [key, slotAttempts] of slots) {
    if (completedAnswerSlots.has(key) || slotAttempts.some((attempt) => attempt.status === "complete")) continue;
    if (slotAttempts.some((attempt) => attempt.status === "excluded")) excluded += 1;
    else if (slotAttempts.some((attempt) => ["failed", "rate_limited"].includes(attempt.status))) failed += 1;
  }
  const completed = completedAnswerSlots.size;
  return {
    completed,
    failed,
    excluded,
    missing: Math.max(0, planned - completed - failed - excluded),
  };
}

export async function loadRunManifest(viewer: Viewer, runId: string): Promise<RunManifest | null> {
  if (viewer.mode === "demo") {
    return {
      runId,
      organizationId: "10000000-0000-4000-8000-000000000001",
      projectId: "20000000-0000-4000-8000-000000000001",
      projectName: "Northstar HR",
      brand: "Northstar HR",
      status: "complete",
      methodologyVersion: "fictional-demo-v1",
      methodologyName: "Fictional demonstration only",
      surfaces: [surfaceFor("mock")],
      providerIds: ["mock"],
      modelIds: ["fictional-demo-model"],
      questions: [],
      plannedObservations: 0,
      completedObservations: 0,
      failedObservations: 0,
      excludedObservations: 0,
      missingObservations: 0,
      requestedUnits: 0,
      estimatedMaximumCostUsd: 0,
      actualCostUsd: 0,
      createdAt: "2026-07-20T10:00:00.000Z",
      startedAt: "2026-07-20T10:00:00.000Z",
      completedAt: "2026-07-20T10:00:00.000Z",
      versions: { prompt: "fictional", parser: "fictional", retrieval: "fictional", policy: "fictional", schema: "fictional", evaluation: "fictional" },
    };
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) return null;
  const safeRunId = encodeURIComponent(runId);
  const [runs, selections, attempts, answers, projects] = await Promise.all([
    supabaseRest<RunRow[]>(
      `runs?select=id,organization_id,project_id,status,provider_ids,prompt_count,requested_units,estimated_max_cost_usd,actual_cost_usd,methodology_version,created_at,started_at,completed_at&id=eq.${safeRunId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
      { token: viewer.accessToken },
    ),
    supabaseRest<SelectionRow[]>(
      `run_prompt_selections?select=prompt_id,prompt_key,prompt_text,locale,market&run_id=eq.${safeRunId}&organization_id=eq.${context.organizationId}&order=created_at.asc&limit=100`,
      { token: viewer.accessToken },
    ),
    supabaseRest<AttemptRow[]>(
      `run_attempts?select=prompt_key,provider,model,status,attempt_number&run_id=eq.${safeRunId}&organization_id=eq.${context.organizationId}&order=created_at.asc&limit=500`,
      { token: viewer.accessToken },
    ),
    supabaseRest<AnswerRow[]>(
      `run_answers?select=prompt_key,provider,model,measurement_context_json&run_id=eq.${safeRunId}&organization_id=eq.${context.organizationId}&order=collected_at.asc&limit=500`,
      { token: viewer.accessToken },
    ),
    supabaseRest<Array<{ id: string; name: string; client_brand: string }>>(
      `projects?select=id,name,client_brand&id=eq.${context.projectId}&organization_id=eq.${context.organizationId}&status=eq.active&limit=1`,
      { token: viewer.accessToken },
    ),
  ]);
  const run = runs[0];
  const project = projects[0];
  if (!run || !project) return null;

  const providerIds = Array.from(new Set(run.provider_ids || []));
  const plannedObservations = selections.length * providerIds.length;
  const counts = terminalObservationCounts(attempts, answers, plannedObservations);
  const modelIds = Array.from(new Set([
    ...answers.flatMap((answer) => answer.model ? [answer.model] : []),
    ...attempts.flatMap((attempt) => attempt.model ? [attempt.model] : []),
  ]));

  return {
    runId: run.id,
    organizationId: run.organization_id,
    projectId: run.project_id,
    projectName: project.name,
    brand: project.client_brand,
    status: run.status,
    methodologyVersion: run.methodology_version,
    methodologyName: CURRENT_OBSERVATION_METHODOLOGY.name,
    surfaces: providerIds.map(surfaceFor),
    providerIds,
    modelIds,
    questions: selections.map((selection) => ({
      promptId: selection.prompt_id,
      promptKey: selection.prompt_key,
      text: selection.prompt_text,
      locale: selection.locale,
      market: selection.market,
    })),
    plannedObservations,
    completedObservations: counts.completed,
    failedObservations: counts.failed,
    excludedObservations: counts.excluded,
    missingObservations: counts.missing,
    requestedUnits: Number(run.requested_units || 0),
    estimatedMaximumCostUsd: Number(run.estimated_max_cost_usd || 0),
    actualCostUsd: Number(run.actual_cost_usd || 0),
    createdAt: run.created_at,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    versions: {
      prompt: oneVersion(answers, "promptVersion"),
      parser: oneVersion(answers, "parserVersion"),
      retrieval: oneVersion(answers, "retrievalVersion"),
      policy: oneVersion(answers, "policyVersion"),
      schema: oneVersion(answers, "schemaVersion"),
      evaluation: oneVersion(answers, "evaluationVersion"),
    },
  };
}
