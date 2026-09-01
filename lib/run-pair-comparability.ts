import type { Viewer } from "@/lib/auth";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import {
  assessExactQuestionComparability,
  coerceComparableMeasurementContext,
  type ComparableQuestionSlot,
} from "@/lib/intelligence-comparability";
import { supabaseRest } from "@/lib/supabase-rest";

type RunRow = {
  id: string;
  status: string;
  methodology_version: string | null;
  created_at: string;
};

type VerifiedAnswerRow = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  measurement_context_json: unknown;
  citations_json: Array<{ url?: string; title?: string }> | null;
  brand_present: boolean | null;
};

export type VerifiedRunComparisonAnswer = {
  runId: string;
  promptKey: string;
  promptText: string;
  provider: string;
  model: string;
  citations: Array<{ url: string; title?: string }>;
  brandPresent: boolean | null;
};

export type RunPairComparability = {
  comparable: boolean;
  reason: string | null;
  answers: VerifiedRunComparisonAnswer[];
};

const terminalReviewedStates = new Set(["complete", "partial"]);

function withheld(reason: string): RunPairComparability {
  return { comparable: false, reason, answers: [] };
}

function answerView(row: VerifiedAnswerRow): VerifiedRunComparisonAnswer | null {
  const promptText = (row.prompt_text || "").replace(/\s+/g, " ").trim();
  const model = (row.model || "").trim();
  if (!promptText || !model || !coerceComparableMeasurementContext(row.measurement_context_json)) return null;
  const citations = (row.citations_json || []).flatMap((citation) => {
    if (!citation.url) return [];
    const canonical = canonicalizeEvidenceUrl(citation.url);
    return canonical ? [{ url: canonical, ...(citation.title ? { title: citation.title } : {}) }] : [];
  });
  return {
    runId: row.run_id,
    promptKey: row.prompt_key,
    promptText,
    provider: row.provider,
    model,
    citations,
    brandPresent: row.brand_present,
  };
}

/**
 * Customer-facing run movement is allowed only for a chronological pair of
 * human-reviewed terminal runs from the active workspace that share the exact
 * methodology and persisted buyer-question/provider/model/measurement-context
 * matrix. The context includes locale, market, buyer stage and version identity.
 *
 * Individual runs remain valid standalone evidence when this returns false.
 */
export async function assessWorkspaceRunPairComparability(
  viewer: Viewer,
  earlierRunId: string,
  laterRunId: string,
): Promise<RunPairComparability> {
  if (viewer.mode === "demo") {
    return withheld("Demo collections are fictional examples, so Foremention does not infer movement between them.");
  }
  if (!viewer.accessToken) {
    return withheld("The signed-in session is incomplete, so the comparison boundary could not be verified.");
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withheld("The active workspace could not be verified.");

  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,status,methodology_version,created_at&organization_id=eq.${context.organizationId}&id=in.(${earlierRunId},${laterRunId})&limit=2`,
    { token: viewer.accessToken },
  );
  const byId = new Map(runs.map((run) => [run.id, run]));
  const earlier = byId.get(earlierRunId);
  const later = byId.get(laterRunId);
  if (!earlier || !later || earlierRunId === laterRunId) {
    return withheld("Both different runs must belong to the active workspace.");
  }
  if (!terminalReviewedStates.has(earlier.status) || !terminalReviewedStates.has(later.status)) {
    return withheld("Both runs must have completed human review before movement can be compared.");
  }
  if (new Date(earlier.created_at).getTime() >= new Date(later.created_at).getTime()) {
    return withheld("Choose the older reviewed collection as Earlier and the newer reviewed collection as Later.");
  }
  if (!earlier.methodology_version || !later.methodology_version) {
    return withheld("Methodology provenance is missing from at least one run.");
  }
  if (earlier.methodology_version !== later.methodology_version) {
    return withheld("The methodology version changed between these reviewed collections.");
  }

  const rows = await supabaseRest<VerifiedAnswerRow[]>(
    `run_answers?select=run_id,prompt_key,prompt_text,provider,model,measurement_context_json,citations_json,brand_present&organization_id=eq.${context.organizationId}&run_id=in.(${earlierRunId},${laterRunId})&review_status=eq.verified&order=collected_at.asc&limit=500`,
    { token: viewer.accessToken },
  );
  const slots: ComparableQuestionSlot[] = rows.map((row) => ({
    runId: row.run_id,
    promptKey: row.prompt_key,
    promptText: row.prompt_text,
    provider: row.provider,
    model: row.model,
    measurementContext: coerceComparableMeasurementContext(row.measurement_context_json),
  }));
  const assessment = assessExactQuestionComparability(laterRunId, earlierRunId, slots);
  if (!assessment.comparable) return withheld(assessment.reason || "The reviewed collections are not exactly comparable.");

  const answers = rows.map(answerView).filter((answer): answer is VerifiedRunComparisonAnswer => Boolean(answer));
  if (answers.length !== rows.length) {
    return withheld("Exact persisted question, model, or measurement context provenance is missing from at least one verified answer.");
  }
  return { comparable: true, reason: null, answers };
}