import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadNotifications, loadPrompts, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { deriveActivationStage, deriveAttentionItems, type ComparableChange } from "@/lib/retention-loop";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [context, prompts, runs, notifications, intelligence] = await Promise.all([
    loadWorkspaceContext(viewer).catch(() => null),
    loadPrompts(viewer).catch(() => []),
    loadRuns(viewer).catch(() => []),
    loadNotifications(viewer).catch(() => []),
    loadSafeWeeklyIntelligence(viewer).catch(() => null),
  ]);
  const newest = runs[0] || null;
  const latestReviewed = runs.find((run) => ["complete", "partial", "review"].includes(run.status)) || null;
  const sources = latestReviewed ? await loadTruthfulSourceMap(viewer, { runId: latestReviewed.id }).catch(() => []) : [];
  let scheduleEnabled = false;
  let firstActionCreated = false;
  let dueActions: Array<{ id: string; title: string; dueAt: string; overdue: boolean }> = [];
  if (viewer.mode !== "demo" && context) {
    try {
      const [schedules, actions, firstAction] = await Promise.all([
        supabaseRest<Array<{ id: string }>>(`measurement_schedules?select=id&organization_id=eq.${context.organizationId}&enabled=eq.true&limit=1`, { token: viewer.accessToken }),
        supabaseRest<Array<{ id: string; page_title: string | null; source_url: string; due_at: string | null; remeasurement_due_at: string | null }>>(`placements?select=id,page_title,source_url,due_at,remeasurement_due_at&organization_id=eq.${context.organizationId}&or=(due_at.not.is.null,remeasurement_due_at.not.is.null)&order=updated_at.desc&limit=50`, { token: viewer.accessToken }),
        supabaseRest<Array<{ id: string }>>(`placements?select=id&organization_id=eq.${context.organizationId}&limit=1`, { token: viewer.accessToken }),
      ]);
      scheduleEnabled = schedules.length > 0;
      firstActionCreated = firstAction.length > 0;
      const now = Date.now();
      dueActions = actions.flatMap((action) => {
        const dueAt = action.remeasurement_due_at || action.due_at;
        if (!dueAt) return [];
        const due = new Date(dueAt).getTime();
        if (!Number.isFinite(due) || due > now + 7 * 86_400_000) return [];
        return [{ id: action.id, title: action.page_title || action.source_url, dueAt, overdue: due < now }];
      });
    } catch (error) {
      if (!isMissingRelationError(error)) console.warn("Retention Attention enrichment unavailable.", error);
    }
  }

  const comparable: ComparableChange[] = [];
  if (intelligence?.latest && intelligence.previous) {
    const delta = intelligence.latest.presence - intelligence.previous.presence;
    if (delta !== 0) comparable.push({ kind: "recommendation_presence_changed", delta, baselineRunId: intelligence.previous.id, currentRunId: intelligence.latest.id });
  } else if (intelligence?.latest && intelligence.changes.some((change) => /withheld/i.test(change.title))) {
    comparable.push({ kind: "comparison_withheld", reason: "The latest reviewed collection does not have an exact buyer-question/provider/model/methodology match yet.", baselineRunId: intelligence.latest.id, currentRunId: intelligence.latest.id });
  }

  const approvedQuestions = prompts.filter((prompt) => prompt.approved).length;
  const firstCollectionCompleted = runs.some((run) => ["complete", "partial", "review"].includes(run.status));
  const firstRecordReviewed = sources.some((source) => Boolean(source.reviewedAt));
  const comparableReviewedCycles = intelligence?.latest && intelligence.previous ? 2 : firstRecordReviewed ? 1 : 0;
  const activation = deriveActivationStage({
    workspaceConfigured: Boolean(context),
    approvedQuestions,
    firstCollectionCompleted,
    firstRecordReviewed,
    firstActionCreated,
    comparableReviewedCycles,
  });
  const onboardingComplete = Boolean(context && approvedQuestions > 0 && runs.length && firstRecordReviewed);
  const activeRun = newest && ["queued", "running", "failed"].includes(newest.status)
    ? { id: newest.id, status: newest.status as "queued" | "running" | "failed", error: newest.errorSummary }
    : null;
  const items = deriveAttentionItems({
    onboardingComplete,
    activeRun,
    reviewBacklog: sources.filter((source) => !source.reviewedAt).length,
    dueActions,
    alerts: notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, href: item.href, createdAt: item.createdAt, unread: !item.read })),
    comparison: comparable,
    scheduleEnabled,
  });
  return NextResponse.json({ data: items, activation, scheduleEnabled, onboardingComplete, mode: viewer.mode });
}
