import { supabaseRest } from "@/lib/supabase-rest";

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
  const entries = await supabaseRest<Array<{ id: string; source_id: string; source_map_id: string }>>(
    `source_map_entries?select=id,source_id,source_map_id&id=eq.${encoded(input.entryId)}&organization_id=eq.${encoded(input.organizationId)}&limit=1`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  const entry = entries[0];
  if (!entry) return null;

  const categoryFilter = input.categoryId ? `&category_id=eq.${encoded(input.categoryId)}` : "";
  const maps = await supabaseRest<Array<{ id: string; run: { project_id: string } | null }>>(
    `source_maps?select=id,run:runs!inner(project_id)&id=eq.${encoded(entry.source_map_id)}&organization_id=eq.${encoded(input.organizationId)}${categoryFilter}&run.project_id=eq.${encoded(input.projectId)}&status=eq.published&limit=1`,
    { token: input.token, serviceRole: input.serviceRole },
  );
  const map = maps[0];
  if (!map || map.run?.project_id !== input.projectId) return null;
  return { id: entry.id, sourceId: entry.source_id, sourceMapId: entry.source_map_id };
}
