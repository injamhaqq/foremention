/**
 * Fenced terminal settlement for collection runs (Chat06, CV-12 / A14 support).
 *
 * A run may only become `failed` or `cancelled` from an ACTIVE state
 * (`queued` or `running`). Every write is a PostgREST compare-and-set on the
 * current status, so:
 *
 * - a run already moved to `review`/`complete`/`partial` by the collector is
 *   never overwritten by a late `onFailure`, timeout or cancellation handler;
 * - a cancellation and a failure racing each other settle exactly once;
 * - capacity is released only for a run that provably never started
 *   (`status=queued AND started_at IS NULL` at the moment of the write), and
 *   the release is idempotent so a retried handler that lost its first
 *   acknowledgement still releases the reservation it owns.
 *
 * The module is transport-agnostic: callers inject the scoped PostgREST calls.
 */

export const ACTIVE_RUN_STATUSES = ["queued", "running"] as const;
export const SETTLED_RUN_STATUSES = ["review", "complete", "partial", "failed", "cancelled"] as const;
export type TerminalRunStatus = "failed" | "cancelled";

export type RunSettlementSnapshot = { status: string; started_at: string | null };

export type RunSettlementIo = {
  /**
   * PATCH runs scoped by id/organization/project PLUS the given extra filter
   * (for example `status=in.(queued,running)`), with `return=representation`.
   * Must return the updated rows (empty when the compare-and-set lost).
   */
  patchWhere(filter: string, body: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  /** Re-read the scoped run. */
  reload(): Promise<RunSettlementSnapshot | null>;
  /** Idempotently delete the run's usage reservation rows. */
  releaseUsage(): Promise<void>;
};

export type RunSettlementResult =
  | { state: "settled"; status: TerminalRunStatus; started: boolean; released: boolean }
  | { state: "already_settled"; currentStatus: string | null; released: boolean };

export type RunSettlementInput = {
  status: TerminalRunStatus;
  errorSummary: string;
  /** Release usage/budget only when the run never started. */
  releaseIfNeverStarted: boolean;
  /** Extra columns (for example actual_cost_usd) written on settlement. */
  body?: Record<string, unknown>;
  now?: () => Date;
};

export const UNSTARTED_ACTIVE_FILTER = "status=eq.queued&started_at=is.null";
export const ACTIVE_FILTER = "status=in.(queued,running)";

export async function settleRunTerminal(io: RunSettlementIo, input: RunSettlementInput): Promise<RunSettlementResult> {
  const completedAt = (input.now?.() ?? new Date()).toISOString();
  const base = {
    ...(input.body ?? {}),
    status: input.status,
    completed_at: completedAt,
    error_summary: input.errorSummary,
  };

  if (input.releaseIfNeverStarted) {
    // Phase 1: fence on "never started". If the collector set started_at in
    // the meantime this CAS loses and the started branch below applies.
    const unstarted = await io.patchWhere(UNSTARTED_ACTIVE_FILTER, { ...base, estimated_max_cost_usd: 0 });
    if (unstarted.length) {
      await io.releaseUsage();
      return { state: "settled", status: input.status, started: false, released: true };
    }
  }

  // Phase 2: fence on any active state; never touch review/complete/partial.
  const started = await io.patchWhere(ACTIVE_FILTER, base);
  if (started.length) {
    const startedAt = started[0]?.started_at;
    return { state: "settled", status: input.status, started: startedAt !== null && startedAt !== undefined, released: false };
  }

  // Lost both CASes: somebody else settled the run. If it was settled to the
  // SAME terminal status and it never started, a previous attempt of this very
  // handler may have crashed between the write and the release. Releasing is
  // idempotent, so finish the release instead of leaking quota/budget.
  const current = await io.reload();
  if (input.releaseIfNeverStarted && current && current.status === input.status && !current.started_at) {
    await io.releaseUsage();
    return { state: "already_settled", currentStatus: current.status, released: true };
  }
  return { state: "already_settled", currentStatus: current?.status ?? null, released: false };
}

/**
 * Runs that stayed active far beyond the worker's hard lifetime are
 * interrupted (lost event, crashed sync, deleted function). The collector's
 * own limits are `timeouts.start=5m` and `timeouts.finish=30m`; the default
 * grace below is four times that so a slow but live run is never swept.
 */
export const STUCK_RUN_GRACE_MINUTES = 140;

export type ActiveRunRow = {
  id: string;
  organization_id: string;
  project_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
};

export function isStuckActiveRun(run: ActiveRunRow, now: Date, graceMinutes = STUCK_RUN_GRACE_MINUTES) {
  if (!ACTIVE_RUN_STATUSES.includes(run.status as (typeof ACTIVE_RUN_STATUSES)[number])) return false;
  const anchor = new Date(run.started_at ?? run.created_at);
  if (!Number.isFinite(anchor.getTime())) return false;
  return now.getTime() - anchor.getTime() > graceMinutes * 60_000;
}
