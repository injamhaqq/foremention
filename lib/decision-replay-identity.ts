/**
 * Compare a previously persisted Record decision with a repeated save request.
 * A save key is an identity for the complete immutable decision payload, not
 * merely for its Record and kind. This is a defensive API acknowledgement
 * check; the database RPC must still provide atomic uniqueness/authorization.
 */
export type RequestedDecisionIdentity = {
  baselineRunId: string;
  kind: string;
  decisionState: string;
  rationale: string;
  ownerId: string | null;
  ownerRole: string | null;
  actionSummary: string | null;
  dueDate: string | null;
  changeSpecificationId: string | null;
  approve: boolean;
};

export type PersistedDecisionIdentity = {
  baseline_run_id: string;
  decision_kind: string;
  decision_state: string;
  rationale: string;
  owner_id: string | null;
  owner_role: string | null;
  action_summary: string | null;
  due_date: string | null;
  change_specification_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

export function sameDecisionReplayIdentity(
  persisted: PersistedDecisionIdentity,
  requested: RequestedDecisionIdentity,
): boolean {
  return persisted.baseline_run_id === requested.baselineRunId
    && persisted.decision_kind === requested.kind
    && persisted.decision_state === requested.decisionState
    && persisted.rationale === requested.rationale
    && persisted.owner_id === requested.ownerId
    && persisted.owner_role === requested.ownerRole
    && persisted.action_summary === requested.actionSummary
    && persisted.due_date === requested.dueDate
    && persisted.change_specification_id === requested.changeSpecificationId
    && Boolean(persisted.approved_by && persisted.approved_at) === requested.approve
    && Boolean(persisted.approved_by) === Boolean(persisted.approved_at);
}

export type PersistedDecisionReplayRow = PersistedDecisionIdentity & {
  id: string;
  organization_id: string;
  project_id: string;
  decided_by: string;
};

export type ReplayReconciliation =
  | { state: "match"; id: string }
  | { state: "conflict" }
  | { state: "unconfirmed" };

/** Confirm a retry by re-reading a single row scoped to the active project. */
export async function reconcilePersistedDecisionReplay(
  readBySaveKey: (key: string) => Promise<PersistedDecisionReplayRow[]>,
  scope: { organizationId: string; projectId: string; actorId?: string },
  saveKey: string,
  request: RequestedDecisionIdentity,
): Promise<ReplayReconciliation> {
  let rows: PersistedDecisionReplayRow[];
  try {
    rows = await readBySaveKey(saveKey);
  } catch {
    return { state: "unconfirmed" };
  }
  const scoped = rows.filter((row) =>
    row.organization_id === scope.organizationId && row.project_id === scope.projectId);
  if (scoped.length > 1) return { state: "conflict" };
  if (!scoped.length) return { state: "unconfirmed" };
  if (scope.actorId && scoped[0].decided_by !== scope.actorId) return { state: "conflict" };
  return sameDecisionReplayIdentity(scoped[0], request)
    ? { state: "match", id: scoped[0].id }
    : { state: "conflict" };
}
