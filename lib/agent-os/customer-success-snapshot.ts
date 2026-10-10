/**
 * Refuse customer-success activation/retention conclusions from partial
 * organization action lists or inconsistent project question references.
 * Historical inactive question IDs remain valid for ownership attribution;
 * only active IDs count toward the separate activation threshold.
 */
export function customerSuccessSnapshotComplete(input: {
  promptScopeIds: ReadonlySet<string>;
  runScopeCount: number;
  prompts: ReadonlyArray<{ id: string; active: boolean }>;
  organizationPlacementCount: number;
  promptLimit: number;
  placementLimit: number;
}): boolean {
  const { promptScopeIds, runScopeCount, prompts, organizationPlacementCount, promptLimit, placementLimit } = input;
  if (![organizationPlacementCount, runScopeCount, promptLimit, placementLimit].every(
    (count) => Number.isSafeInteger(count) && count >= 0,
  ) || promptLimit < 1 || placementLimit < 1) return false;
  // Some PostgREST deployments cap response rows at the limit itself. Reject
  // a full result at the boundary, not only an impossible +1 sentinel row.
  if (prompts.length >= promptLimit || organizationPlacementCount >= placementLimit
      || promptScopeIds.size >= promptLimit || runScopeCount >= promptLimit) return false;
  if (prompts.length !== promptScopeIds.size) return false;
  const seen = new Set<string>();
  for (const row of prompts) {
    if (!row || typeof row.id !== "string" || !row.id || typeof row.active !== "boolean"
      || !promptScopeIds.has(row.id) || seen.has(row.id)) return false;
    seen.add(row.id);
  }
  return true;
}
