import { supabaseRest } from "@/lib/supabase-rest";

export const MAX_PROJECT_SOURCE_MAPS = 1000;

export type ProjectSourceMapRef = {
  id: string;
  runId: string;
};

export type ProjectSourceMapEntryRef = {
  id: string;
  sourceId: string;
  sourceMapId: string;
};

function encoded(value: string) {
  return encodeURIComponent(value);
}

export async function loadLatestProjectSourceMapRef(input: {
  organizationId: string;
  projectId: string;
  categoryId?: string | null;
  runId?: string | null;
  token?: string;
  serviceRole?: boolean;
}): Promise<ProjectSourceMapRef | null> {
  const categoryFilter = input.categoryId ? `&category_id=eq.${encoded(input.categoryId)}` : "";
  const runFilter = input.runId ? `&run_id=eq.${encoded(input.runId)}` : "";
  const rows = await supabaseRest<Array<{
    id: string;
    run_id: string | null;
    run: { project_id: string } | null;
  }>>(
    `source_maps?select=id,run_id,run:runs!inner(project_id)&organization_id=eq.${encoded(input.organizationId)}${categoryFilter}${runFilter}&run.project_id=eq.${encoded(input.projectId)}&status=eq.published&order=created_at.desc&limit=1`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  const row = rows[0];
  if (!row?.run_id || row.run?.project_id !== input.projectId) return null;
  return { id: row.id, runId: row.run_id };
}

export async function loadProjectSourceMapEntryRef(input: {
  organizationId: string;
  projectId: string;
  categoryId?: string | null;
  entryId: string;
  token?: string;
  serviceRole?: boolean;
}): Promise<ProjectSourceMapEntryRef | null> {
  const categoryFilter = input.categoryId ? `&category_id=eq.${encoded(input.categoryId)}` : "";
  const maps = await supabaseRest<Array<{ id: string }>>(
    `source_maps?select=id,run:runs!inner(project_id)&organization_id=eq.${encoded(input.organizationId)}${categoryFilter}&run.project_id=eq.${encoded(input.projectId)}&status=eq.published&order=created_at.desc&limit=${MAX_PROJECT_SOURCE_MAPS + 1}`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  if (!maps.length || maps.length > MAX_PROJECT_SOURCE_MAPS) return null;
  const mapIds = maps.map((row) => row.id);
  const rows = await supabaseRest<Array<{ id: string; source_id: string; source_map_id: string }>>(
    `source_map_entries?select=id,source_id,source_map_id&id=eq.${encoded(input.entryId)}&organization_id=eq.${encoded(input.organizationId)}&source_map_id=in.(${mapIds.join(",")})&limit=1`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  const row = rows[0];
  return row ? { id: row.id, sourceId: row.source_id, sourceMapId: row.source_map_id } : null;
}
