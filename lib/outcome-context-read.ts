import {
  evaluateFollowUpContextParity,
  type OutcomeContextRun,
  type OutcomeContextAnswer,
} from "./outcome-context-gate";
import type { OutcomeLedgerFollowUpRow } from "./outcome-ledger";
import { supabaseRest } from "./supabase-rest";

/**
 * Authenticated, organization-scoped reporting read. Only request minimal
 * per-answer comparison metadata, never raw answer text, citations or tokens.
 * The caller must supply runs already filtered to the active workspace project.
 */
export async function loadOutcomeContextParity(input: {
  accessToken: string;
  organizationId: string;
  runs: OutcomeContextRun[];
  followUps: OutcomeLedgerFollowUpRow[];
}) {
  const scopedRuns = input.runs.filter((run) => run.id);
  const accessibleRunIds = new Set(scopedRuns.map((run) => run.id));
  const pairedRunIds = Array.from(new Set(input.followUps
    .filter((row) => row.status === "complete")
    .flatMap((row) => [row.baseline_run_id, row.rerun_id])
    .filter((id): id is string => Boolean(id) && accessibleRunIds.has(id as string))));

  const verifiedAnswers: OutcomeContextAnswer[] = [];
  const saturatedRunIds = new Set<string>();
  // Small batches keep ordinary five-question customers fast. The hard cutoff
  // fails closed if any batch reaches PostgREST's normal max-response boundary.
  const batchSize = 10;
  for (let i = 0; i < pairedRunIds.length; i += batchSize) {
    const batch = pairedRunIds.slice(i, i + batchSize);
    const rows = await supabaseRest<OutcomeContextAnswer[]>(
      `run_answers?select=run_id,prompt_key,prompt_text,provider,model,measurement_context_json&organization_id=eq.${input.organizationId}&run_id=in.(${batch.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=1000`,
      { token: input.accessToken },
    );
    if (rows.length >= 1000) {
      for (const id of batch) saturatedRunIds.add(id);
      continue;
    }
    verifiedAnswers.push(...rows);
  }

  return evaluateFollowUpContextParity({
    followUps: input.followUps,
    runs: scopedRuns,
    verifiedAnswers,
    saturatedRunIds,
  });
}
