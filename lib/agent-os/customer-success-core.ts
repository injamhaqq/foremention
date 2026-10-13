export type CustomerSuccessPlacementLink = {
  target_prompt_ids: string[] | null;
  baseline_run_id: string | null;
  remeasurement_run_id: string | null;
};

export function placementBelongsToProject(
  placement: CustomerSuccessPlacementLink,
  projectPromptIds: ReadonlySet<string>,
  projectRunIds: ReadonlySet<string>,
) {
  const promptIds = Array.isArray(placement.target_prompt_ids) ? placement.target_prompt_ids : [];
  const hasAnyLink = promptIds.length > 0
    || Boolean(placement.baseline_run_id)
    || Boolean(placement.remeasurement_run_id);
  if (!hasAnyLink) return false;

  // Placements are organization-scoped. One matching prompt/run must not
  // conceal an additional foreign, unknown, or stale project link.
  // Require every durable reference to resolve inside the selected project.
  if (!promptIds.every((id) => projectPromptIds.has(id))) return false;
  if (placement.baseline_run_id && !projectRunIds.has(placement.baseline_run_id)) return false;
  if (placement.remeasurement_run_id && !projectRunIds.has(placement.remeasurement_run_id)) return false;
  return true;
}
