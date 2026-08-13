import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import type { SourceCrawlerAccess } from "@/lib/source-inspection";
import type { SourceSnapshotChangeState } from "@/lib/source-snapshots";
import { supabaseRest } from "@/lib/supabase-rest";

type ChangeGraphSnapshotRow = {
  id: string;
  source_id: string;
  run_id: string | null;
  previous_snapshot_id: string | null;
  canonical_url: string;
  final_url: string;
  retrieved_at: string;
  access: SourceCrawlerAccess;
  http_status: number | null;
  page_title: string | null;
  change_state: SourceSnapshotChangeState;
  change_reason: string | null;
};

export type SourceChangeEvent = {
  id: string;
  sourceId: string;
  previousSnapshotId: string | null;
  checkedAt: string;
  canonicalUrl: string;
  finalUrl: string;
  pageTitle: string | null;
  access: SourceCrawlerAccess;
  httpStatus: number | null;
  changeState: "changed" | "unreachable";
  changeReason: string | null;
  collectionLinked: boolean;
  linkedObservationCount: number;
};

export type SourceChangeGraph = {
  checkedCount: number;
  baselineCount: number;
  unchangedCount: number;
  differenceCount: number;
  unreachableCount: number;
  nonComparableCount: number;
  latestCheckedAt: string | null;
  events: SourceChangeEvent[];
};

export const EMPTY_SOURCE_CHANGE_GRAPH: SourceChangeGraph = {
  checkedCount: 0,
  baselineCount: 0,
  unchangedCount: 0,
  differenceCount: 0,
  unreachableCount: 0,
  nonComparableCount: 0,
  latestCheckedAt: null,
  events: [],
};

export function buildSourceChangeGraph(
  rows: ChangeGraphSnapshotRow[],
  observationCounts: ReadonlyMap<string, number> = new Map(),
): SourceChangeGraph {
  if (!rows.length) return EMPTY_SOURCE_CHANGE_GRAPH;

  const ordered = [...rows].sort((left, right) => right.retrieved_at.localeCompare(left.retrieved_at));
  const baselineCount = ordered.filter((row) => row.change_state === "initial").length;
  const unchangedCount = ordered.filter((row) => row.change_state === "unchanged").length;
  const differenceCount = ordered.filter((row) => row.change_state === "changed").length;
  const unreachableCount = ordered.filter((row) => row.change_state === "unreachable").length;
  const nonComparableCount = ordered.filter((row) => row.change_state === "unknown").length;
  const events = ordered
    .filter((row): row is ChangeGraphSnapshotRow & { change_state: "changed" | "unreachable" } => (
      row.change_state === "changed" || row.change_state === "unreachable"
    ))
    .slice(0, 20)
    .map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      previousSnapshotId: row.previous_snapshot_id,
      checkedAt: row.retrieved_at,
      canonicalUrl: row.canonical_url,
      finalUrl: row.final_url,
      pageTitle: row.page_title,
      access: row.access,
      httpStatus: row.http_status,
      changeState: row.change_state,
      changeReason: row.change_reason,
      collectionLinked: Boolean(row.run_id),
      linkedObservationCount: observationCounts.get(row.id) || 0,
    }));

  return {
    checkedCount: ordered.length,
    baselineCount,
    unchangedCount,
    differenceCount,
    unreachableCount,
    nonComparableCount,
    latestCheckedAt: ordered[0]?.retrieved_at || null,
    events,
  };
}

export async function loadSourceChangeGraph(
  viewer: Viewer,
  sourceIds: string[],
  options: { limit?: number } = {},
): Promise<SourceChangeGraph> {
  if (viewer.mode === "demo" || !viewer.accessToken) return EMPTY_SOURCE_CHANGE_GRAPH;
  const context = await loadWorkspaceContext(viewer);
  if (!context) return EMPTY_SOURCE_CHANGE_GRAPH;

  const scopedSourceIds = Array.from(new Set(sourceIds.filter(Boolean))).slice(0, 250);
  if (!scopedSourceIds.length) return EMPTY_SOURCE_CHANGE_GRAPH;
  const limit = Math.max(1, Math.min(options.limit || 120, 250));

  const rows = await supabaseRest<ChangeGraphSnapshotRow[]>(
    `source_snapshots?select=id,source_id,run_id,previous_snapshot_id,canonical_url,final_url,retrieved_at,access,http_status,page_title,change_state,change_reason&organization_id=eq.${context.organizationId}&source_id=in.(${scopedSourceIds.join(",")})&order=retrieved_at.desc&limit=${limit}`,
    { token: viewer.accessToken },
  );
  if (!rows.length) return EMPTY_SOURCE_CHANGE_GRAPH;

  const snapshotIds = rows.map((row) => row.id);
  const links = await supabaseRest<Array<{ source_snapshot_id: string }>>(
    `source_snapshot_observations?select=source_snapshot_id&source_snapshot_id=in.(${snapshotIds.join(",")})`,
    { token: viewer.accessToken },
  );
  const counts = new Map<string, number>();
  for (const link of links) counts.set(link.source_snapshot_id, (counts.get(link.source_snapshot_id) || 0) + 1);

  return buildSourceChangeGraph(rows, counts);
}
