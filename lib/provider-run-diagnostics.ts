import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export type ProviderRunDiagnostics = {
  answerId: string;
  provider: string;
  searchUsed: boolean | null;
  searchResultCount: number | null;
  citationCount: number | null;
};

type RawAnswerRow = {
  id: string;
  provider: string;
  raw_json: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

export function sanitizeProviderRunDiagnostics(answerId: string, provider: string, raw: unknown): ProviderRunDiagnostics | null {
  if (provider !== "groq") return null;
  const metadata = record(raw);
  if (!metadata || metadata.searchObservationVersion !== 1) return null;
  return {
    answerId,
    provider,
    searchUsed: typeof metadata.searchUsed === "boolean" ? metadata.searchUsed : null,
    searchResultCount: count(metadata.searchResultCount),
    citationCount: count(metadata.citationCount),
  };
}

export async function loadProviderRunDiagnostics(viewer: Viewer, runId: string): Promise<ProviderRunDiagnostics[]> {
  if (viewer.mode === "demo") return [];
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const encodedOrganizationId = encodeURIComponent(context.organizationId);
  const encodedProjectId = encodeURIComponent(context.projectId);
  const encodedRunId = encodeURIComponent(runId);
  const rows = await supabaseRest<Array<RawAnswerRow & { run: { project_id: string } | null }>>(
    `run_answers?select=id,provider,raw_json,run:runs!inner(project_id)&organization_id=eq.${encodedOrganizationId}&run_id=eq.${encodedRunId}&run.project_id=eq.${encodedProjectId}&provider=eq.groq&order=collected_at.asc`,
    { token: viewer.accessToken },
  );
  return rows
    .map((row) => sanitizeProviderRunDiagnostics(row.id, row.provider, row.raw_json))
    .filter((item): item is ProviderRunDiagnostics => Boolean(item));
}
