import type { Viewer } from "@/lib/auth";
import { getPrimaryOrganizationId } from "@/lib/data";
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
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<RawAnswerRow[]>(
    `run_answers?select=id,provider,raw_json&organization_id=eq.${organizationId}&run_id=eq.${runId}&order=collected_at.asc`,
    { token: viewer.accessToken },
  );
  return rows
    .map((row) => sanitizeProviderRunDiagnostics(row.id, row.provider, row.raw_json))
    .filter((item): item is ProviderRunDiagnostics => Boolean(item));
}
