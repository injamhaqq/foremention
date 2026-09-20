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
  const linkedByPrompt = Array.isArray(placement.target_prompt_ids)
    && placement.target_prompt_ids.some((id) => projectPromptIds.has(id));
  const linkedByBaselineRun = Boolean(
    placement.baseline_run_id && projectRunIds.has(placement.baseline_run_id),
  );
  const linkedByRemeasurementRun = Boolean(
    placement.remeasurement_run_id && projectRunIds.has(placement.remeasurement_run_id),
  );
  return linkedByPrompt || linkedByBaselineRun || linkedByRemeasurementRun;
}
