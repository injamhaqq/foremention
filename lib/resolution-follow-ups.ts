import { supabaseRest } from "@/lib/supabase-rest";

export type ComparableRunTerminalStatus = "complete" | "partial" | "failed" | "cancelled";

/**
 * Finalize any durable resolution measurement attached to a terminal run.
 *
 * The database trigger validates tenant/run comparability and builds the
 * before/after outcome from persisted run metrics. Callers deliberately do
 * not calculate or submit customer metrics here.
 */
export async function finalizeResolutionFollowUpsForRun(input: {
  organizationId: string;
  runId: string;
  runStatus: ComparableRunTerminalStatus;
  recordedBy?: string | null;
}) {
  const followUpStatus = input.runStatus === "complete" || input.runStatus === "partial"
    ? "complete"
    : input.runStatus;

  try {
    await supabaseRest(
      `resolution_follow_ups?organization_id=eq.${input.organizationId}&rerun_id=eq.${input.runId}&status=eq.queued`,
      {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=minimal",
        body: {
          status: followUpStatus,
          recorded_by: input.recordedBy || null,
          completed_at: new Date().toISOString(),
        },
      },
    );
  } catch {
    // Run completion must never be rolled back because an optional resolution
    // follow-up could not be synchronized. The database run-status trigger is
    // the authoritative retry-safe path once the migration is installed.
    console.warn("Resolution follow-up synchronization was deferred.");
  }
}
