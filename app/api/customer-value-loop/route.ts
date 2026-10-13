import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { computeCustomerValueLoop } from "@/lib/customer-value-loop";
import {
  buildLoopSnapshot,
  LOOP_ANSWER_COLUMNS,
  LOOP_ANSWER_LIMIT,
  LOOP_RUN_COLUMNS,
  LOOP_RUN_LIMIT,
  type LoopAnswerRow,
  type LoopRunRow,
} from "@/lib/customer-value-loop-snapshot";
import { decisionDbFailure, decisionRowToLoop, RECORD_DECISION_COLUMNS, type RecordDecisionRow } from "@/lib/record-decisions";
import { supabaseRest } from "@/lib/supabase-rest";

// Chat04 CV-05 / A14 / A15: read-only customer value loop state for the active
// project, computed from persisted rows only (approved question-set epoch,
// reviewed runs with sampling/method/nine-field context, saved decisions).
// Causation is never claimed; fixture/unknown-origin cycles never close proof.
const noStore = { "cache-control": "no-store" };

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (viewer.mode === "demo") return NextResponse.json({ data: null, mode: "demo", reason: "The demo workspace has no persisted decisions or cycles." }, { headers: noStore });
  const context = await loadWorkspaceContext(viewer);
  if (!context) {
    return NextResponse.json({ data: computeCustomerValueLoop({ organizationId: null, projectId: null, brand: null, competitors: [], approvedQuestions: null, collectionRequested: false, runs: [], decisions: [] }) }, { headers: noStore });
  }
  const org = encodeURIComponent(context.organizationId);
  const project = encodeURIComponent(context.projectId);
  const token = viewer.accessToken;
  try {
    const [activePrompts, epochs, runs, decisions] = await Promise.all([
      supabaseRest<Array<{ prompt_text: string; updated_at: string }>>(`prompts?select=prompt_text,updated_at&organization_id=eq.${org}&project_id=eq.${project}&active=eq.true&order=created_at.asc&limit=25`, { token }),
      supabaseRest<Array<{ version: number }>>(`project_question_set_versions?select=version&organization_id=eq.${org}&project_id=eq.${project}&limit=1`, { token }),
      supabaseRest<LoopRunRow[]>(`runs?select=${LOOP_RUN_COLUMNS}&organization_id=eq.${org}&project_id=eq.${project}&order=created_at.desc&limit=${LOOP_RUN_LIMIT}`, { token }),
      supabaseRest<RecordDecisionRow[]>(`record_decisions?select=${RECORD_DECISION_COLUMNS}&organization_id=eq.${org}&project_id=eq.${project}&order=decided_at.desc&limit=50`, { token }),
    ]);
    const runIds = runs.map((run) => run.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const answers = runIds.length
      ? await supabaseRest<LoopAnswerRow[]>(`run_answers?select=${LOOP_ANSWER_COLUMNS}&organization_id=eq.${org}&run_id=in.(${runIds.join(",")})&limit=${LOOP_ANSWER_LIMIT}`, { token })
      : [];
    const snapshot = buildLoopSnapshot({
      organizationId: context.organizationId,
      projectId: context.projectId,
      brand: context.projectBrand,
      activePrompts,
      questionSetVersion: epochs[0]?.version ?? null,
      runs,
      answers,
      decisions: decisions.map(decisionRowToLoop),
    });
    return NextResponse.json({
      data: computeCustomerValueLoop(snapshot),
      // Only the newest runs are assessed; older Records keep their own pages.
      window: { runs: runs.length, runLimit: LOOP_RUN_LIMIT, answersTruncated: answers.length >= LOOP_ANSWER_LIMIT },
    }, { headers: noStore });
  } catch (error) {
    const mapped = decisionDbFailure(error);
    if (!mapped) throw error;
    return NextResponse.json({ error: mapped.error, ...(mapped.code ? { code: mapped.code } : {}) }, { status: mapped.status, headers: noStore });
  }
}
