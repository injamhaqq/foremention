import type { CustomerSuccessPlacementLink } from "@/lib/agent-os/customer-success-core";
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
  serviceRole?: boolean;
}): Promise<ProjectPlacementScope | null> {
  const [prompts, runs] = await Promise.all([
    supabaseRest<Array<{ id: string }>>(
      `prompts?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.asc&limit=${MAX_PROJECT_PLACEMENT_SCOPE_LINKS + 1}`,
      { token: input.token, serviceRole: input.serviceRole },
    ),
    supabaseRest<Array<{ id: string }>>(
      `runs?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&order=created_at.desc&limit=${MAX_PROJECT_PLACEMENT_SCOPE_LINKS + 1}`,
      { token: input.token, serviceRole: input.serviceRole },
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
  const promptIds = Array.isArray(placement.target_prompt_ids)
    ? placement.target_prompt_ids
    : [];
  const hasAnyProjectLink = promptIds.length > 0
    || Boolean(placement.baseline_run_id)
    || Boolean(placement.remeasurement_run_id);
  if (!hasAnyProjectLink) return false;

  // Fail closed on ambiguous legacy placements. A placement may be exported for
  // this project only when every durable prompt/run link resolves to this
  // project's verified scope. One matching link must never mask a foreign,
  // unknown, or stale link.
  if (!promptIds.every((id) => scope.promptIds.has(id))) return false;
  if (placement.baseline_run_id && !scope.runIds.has(placement.baseline_run_id)) return false;
  if (placement.remeasurement_run_id && !scope.runIds.has(placement.remeasurement_run_id)) return false;
  return true;
}

export function filterPlacementsToProject<T extends CustomerSuccessPlacementLink>(
  rows: T[],
  scope: ProjectPlacementScope,
): T[] {
  if (rows.length > MAX_PROJECT_PLACEMENTS) return [];
  return rows.filter((row) => placementBelongsToScope(row, scope));
}
