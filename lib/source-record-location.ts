// Fix track "ux" (2026-10-19): /app/sources/[id] links are emitted by the
// Sources table ("Review source"), the Overview, notifications, comments,
// webhooks and the Change Graph. Since the standalone source surface was
// retired, that route redirected every link straight back to
// /app/source-map, so a source could never be opened or reviewed from those
// links. Source inspection and human review now live inside the
// Recommendation Record that produced the source map entry, so the route
// resolves the entry to that exact run and opens its evidence in place.
//
// No "@/..." imports here so the resolver can be exercised directly by tests.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Live entries are UUIDs; the fictional demo uses short ids such as "src-01".
const SAFE_ENTRY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export type RestReader = <T>(path: string) => Promise<T>;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isSourceEntryId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ENTRY_ID.test(value);
}

export function sourceEvidenceAnchor(entryId: string) {
  return `source-${entryId}`;
}

/** In-app location of a source map entry inside its Recommendation Record. */
export function sourceRecordHref(runId: string, entryId: string): string | null {
  if (!isSourceEntryId(runId) || !isSourceEntryId(entryId)) return null;
  return `/app/runs/${encodeURIComponent(runId)}?source=${encodeURIComponent(entryId)}#${sourceEvidenceAnchor(entryId)}`;
}

/**
 * Resolve a live source map entry to the run that published it, scoped to the
 * viewer's organization AND active project (RLS still applies through the
 * viewer token supplied by the caller's reader). Returns null when the entry
 * does not exist, belongs to another organization/project, or its map is not
 * published.
 */
export async function resolveSourceRecordRunId(input: {
  organizationId: string;
  projectId: string;
  categoryId?: string | null;
  entryId: string;
  rest: RestReader;
}): Promise<string | null> {
  if (!isUuid(input.entryId)) return null;
  const org = encodeURIComponent(input.organizationId);
  const entries = await input.rest<Array<{ id: string; source_map_id: string | null }>>(
    `source_map_entries?select=id,source_map_id&id=eq.${encodeURIComponent(input.entryId)}&organization_id=eq.${org}&limit=1`,
  );
  const entry = entries[0];
  if (!entry || entry.id !== input.entryId || !entry.source_map_id) return null;
  const categoryFilter = input.categoryId ? `&category_id=eq.${encodeURIComponent(input.categoryId)}` : "";
  const maps = await input.rest<Array<{ id: string; run_id: string | null; run: { project_id: string } | null }>>(
    `source_maps?select=id,run_id,run:runs!inner(project_id)&id=eq.${encodeURIComponent(entry.source_map_id)}&organization_id=eq.${org}${categoryFilter}&run.project_id=eq.${encodeURIComponent(input.projectId)}&status=eq.published&limit=1`,
  );
  const map = maps[0];
  if (!map || map.id !== entry.source_map_id || !map.run_id || map.run?.project_id !== input.projectId) return null;
  return isUuid(map.run_id) ? map.run_id : null;
}

/** Demo-only: first fictional run whose source map contains the entry. */
export function resolveDemoSourceRunId(
  entryId: string,
  runIds: string[],
  sourceMapFor: (runId: string) => Array<{ id: string }>,
): string | null {
  if (!isSourceEntryId(entryId)) return null;
  for (const runId of runIds) if (sourceMapFor(runId).some((entry) => entry.id === entryId)) return runId;
  return null;
}
