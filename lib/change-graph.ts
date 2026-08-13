import type { Viewer } from "@/lib/auth";
import {
  buildSourceChangeGraph,
  EMPTY_SOURCE_CHANGE_GRAPH,
  type ChangeGraphSnapshotRow,
  type SourceChangeGraph,
} from "@/lib/change-graph-core";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export {
  buildSourceChangeGraph,
  EMPTY_SOURCE_CHANGE_GRAPH,
  type ChangeGraphSnapshotRow,
  type SourceChangeEvent,
  type SourceChangeGraph,
} from "@/lib/change-graph-core";

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
