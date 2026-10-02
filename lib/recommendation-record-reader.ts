import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import {
  MAX_SHARED_RECORD_ANSWERS,
  assessSharedRecordEvidenceSet,
  type SharedRecordEvidenceState,
} from "@/lib/shared-record-evidence-gate";
import { supabaseRest } from "@/lib/supabase-rest";

export type RecommendationRecordRun = {
  id: string;
  status: string;
  answerCount: number;
  citationCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type RecommendationRecordAnswer = {
  id: string;
  promptKey: string;
  prompt: string;
  provider: string;
  model: string | null;
  answer: string;
  citations: Array<{ url?: string; title?: string }>;
  reviewStatus: string;
  collectedAt: string;
};

export type AuthenticatedRecommendationRecord = {
  run: RecommendationRecordRun;
  answers: RecommendationRecordAnswer[];
  evidenceState: SharedRecordEvidenceState;
};

type RunRow = {
  id: string;
  status: string;
  answer_count: number;
  citation_count: number;
  created_at: string;
  completed_at: string | null;
};

type AnswerRow = {
  id: string;
  run_id: string;
  prompt_key: string | null;
  prompt_text: string | null;
  provider: string | null;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string; title?: string }> | null;
  review_status: string;
  collected_at: string;
};

/**
 * Read one authenticated Recommendation Record under the active project and
 * prove the independently persisted full answer set before any print/export
 * surface can present it as a complete Record.
 */
export async function loadAuthenticatedRecommendationRecord(
  viewer: Viewer,
  runId: string,
): Promise<AuthenticatedRecommendationRecord | null> {
  if (viewer.mode === "demo") return null;
  const context = await loadWorkspaceContext(viewer);
  if (!context) return null;

  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,status,answer_count,citation_count,created_at,completed_at&id=eq.${encodeURIComponent(runId)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1`,
    { token: viewer.accessToken },
  );
  const run = runs[0];
  if (!run) return null;

  const rows = await supabaseRest<AnswerRow[]>(
    `run_answers?select=id,run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at&organization_id=eq.${context.organizationId}&run_id=eq.${encodeURIComponent(run.id)}&order=collected_at.asc&limit=${MAX_SHARED_RECORD_ANSWERS + 1}`,
    { token: viewer.accessToken },
  );
  const evidenceState = assessSharedRecordEvidenceSet(run, rows);
  const answers = evidenceState.fullyLoaded
    ? rows.map((row) => ({
      id: row.id,
      promptKey: row.prompt_key || "",
      prompt: row.prompt_text || row.prompt_key || "Recorded buyer question",
      provider: row.provider || "Unknown provider",
      model: row.model,
      answer: row.answer_text,
      citations: Array.isArray(row.citations_json) ? row.citations_json : [],
      reviewStatus: row.review_status,
      collectedAt: row.collected_at,
    }))
    : [];

  return {
    run: {
      id: run.id,
      status: run.status,
      answerCount: run.answer_count,
      citationCount: run.citation_count,
      createdAt: run.created_at,
      completedAt: run.completed_at,
    },
    answers,
    evidenceState,
  };
}
