import {
  placementBelongsToProject,
  type CustomerSuccessPlacementLink,
} from "@/lib/agent-os/customer-success-core";
import { supabaseRest } from "@/lib/supabase-rest";

export const MAX_PROJECT_PLACEMENT_SCOPE_LINKS = 1000;
export const MAX_PROJECT_PLACEMENTS = 1000;

export type ProjectPlacementScope = {
  promptIds: ReadonlySet<string>;
  runIds: ReadonlySet<string>;
};

export async function loadProjectPlacementScope(input: {
  organizationId: string;
  projectId: string;
  token?: string;
}): Promise<ProjectPlacementScope | null> {
  const [prompts, runs] = await Promise.all([
    supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.asc&limit=${MAX_PROJECT_PLACEMENT_SCOPE_LINKS + 1}`,
      { token: input.token },
    ),
    supabaseRest<Array<{ id: string }>>(
      `runs?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.desc&limit=${MAX_PROJECT_PLACEMENT_SCOPE_LINKS + 1}`,
      { token: input.token },
    ),
  ]);
  if (
    prompts.length > MAX_PROJECT_PLACEMENT_SCOPE_LINKS
    || runs.length > MAX_PROJECT_PLACEMENT_SCOPE_LINKS
  ) return null;
  return {
    promptIds: new Set(prompts.map((item) => item.id)),
    runIds: new Set(runs.map((item) => item.id)),
  };
}

export function placementBelongsToScope(
  placement: CustomerSuccessPlacementLink,
  scope: ProjectPlacementScope,
) {
  return placementBelongsToProject(placement, scope.promptIds, scope.runIds);
}

export function filterPlacementsToProject<T extends CustomerSuccessPlacementLink>(
  rows: T[],
  scope: ProjectPlacementScope,
): T[] {
  if (rows.length > MAX_PROJECT_PLACEMENTS) return [];
  return rows.filter((row) => placementBelongsToScope(row, scope));
}
