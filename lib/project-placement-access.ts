import { supabaseRest } from "@/lib/supabase-rest";

export type ProjectPlacementLinkSets = {
  promptIds: Set<string>;
  runIds: Set<string>;
};

export async function loadProjectPlacementLinkSets(input: {
  organizationId: string;
  projectId: string;
  token: string;
}): Promise<ProjectPlacementLinkSets> {
  const [prompts, runs] = await Promise.all([
    supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.asc&limit=1000`,
      { token: input.token },
    ),
    supabaseRest<Array<{ id: string }>>(
      `runs?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.desc&limit=1000`,
      { token: input.token },
    ),
  ]);
  return {
    promptIds: new Set(prompts.map((row) => row.id)),
    runIds: new Set(runs.map((row) => row.id)),
  };
}

/**
 * Resolve a source observed in a published map back to a run owned by the
 * active project. This gives newly created placements a durable project link
 * without adding a project_id migration to the legacy organization-owned table.
 */
export async function findProjectSourceBaselineRunId(input: {
  organizationId: string;
  projectId: string;
  categoryId: string;
  sourceId: string;
  token: string;
}): Promise<string | null> {
  const entries = await supabaseRest<Array<{ source_map_id: string }>>(
    `source_map_entries?select=source_map_id&organization_id=eq.${input.organizationId}&source_id=eq.${encodeURIComponent(input.sourceId)}&order=updated_at.desc&limit=20`,
    { token: input.token },
  );
  const mapIds = Array.from(new Set(entries.map((row) => row.source_map_id).filter(Boolean)));
  if (!mapIds.length) return null;

  const maps = await supabaseRest<Array<{ id: string; run_id: string | null }>>(
    `source_maps?select=id,run_id&organization_id=eq.${input.organizationId}&category_id=eq.${input.categoryId}&status=eq.published&id=in.(${mapIds.join(",")})&order=created_at.desc&limit=20`,
    { token: input.token },
  );
  const runIds = Array.from(new Set(maps.flatMap((row) => row.run_id ? [row.run_id] : [])));
  if (!runIds.length) return null;

  const runs = await supabaseRest<Array<{ id: string }>>(
    `runs?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&id=in.(${runIds.join(",")})&limit=20`,
    { token: input.token },
  );
  const projectRunIds = new Set(runs.map((row) => row.id));
  return maps.find((row) => row.run_id && projectRunIds.has(row.run_id))?.run_id || null;
}
