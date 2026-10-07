import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadNotifications, loadPrompts, loadProviderStatuses, loadRunAnswers, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { deriveRetentionHealth } from "@/lib/retention-health";
import { deriveActivationStage, deriveAttentionItems, type ComparableChange } from "@/lib/retention-loop";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";
import { buildBaselineGuidance } from "@/lib/baseline-guidance";
import { filterPlacementsToProject, loadProjectPlacementScope, MAX_PROJECT_PLACEMENTS } from "@/lib/project-placement-scope";
import type { CustomerSuccessPlacementLink } from "@/lib/agent-os/customer-success-core";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [context, prompts, runs, notifications, intelligence, providers] = await Promise.all([
      loadWorkspaceContext(viewer),
      loadPrompts(viewer),
      loadRuns(viewer),
      loadNotifications(viewer),
      loadSafeWeeklyIntelligence(viewer),
      loadProviderStatuses(viewer),
    ]);
    const newest = runs[0] || null;
    const latestReviewed = runs.find((run) => ["complete", "partial", "review"].includes(run.status)) || null;
    const sources = latestReviewed ? await loadTruthfulSourceMap(viewer, { runId: latestReviewed.id }) : [];
    let scheduleEnabled = false;
    let firstActionCreated = false;
    let firstActionAssigned = false;
    let dueActions: Array<{ id: string; title: string; dueAt: string; overdue: boolean }> = [];
    if (viewer.mode !== "demo" && context) {
      const scope = await loadProjectPlacementScope({ organizationId: context.organizationId, projectId: context.projectId, token: viewer.accessToken });
      if (!scope) throw new Error("Active-project action scope is unavailable.");
      const [schedules, rows] = await Promise.all([
        supabaseRest<Array<{ id: string }>>(`measurement_schedules?select=id&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&enabled=eq.true&limit=1`, { token: viewer.accessToken }),
        supabaseRest<Array<CustomerSuccessPlacementLink & { id: string; owner_id: string | null; page_title: string | null; source_url: string; due_at: string | null; remeasurement_due_at: string | null }>>(`placements?select=id,owner_id,page_title,source_url,due_at,remeasurement_due_at,target_prompt_ids,baseline_run_id,remeasurement_run_id&organization_id=eq.${context.organizationId}&order=created_at.asc&limit=${MAX_PROJECT_PLACEMENTS + 1}`, { token: viewer.accessToken }),
      ]);
      if (rows.length > MAX_PROJECT_PLACEMENTS) throw new Error("Active-project action coverage is incomplete.");
      const actions = filterPlacementsToProject(rows, scope);
      scheduleEnabled = schedules.length > 0;
      firstActionCreated = actions.length > 0;
      firstActionAssigned = actions.some((action) => Boolean(action.owner_id));
      const now = Date.now();
      dueActions = actions.flatMap((action) => {
        // A task due date does not mean remeasurement is due.
        const dueAt = action.remeasurement_due_at;
        if (!dueAt) return [];
        const due = new Date(dueAt).getTime();
        if (!Number.isFinite(due) || due > now + 7 * 86_400_000) return [];
        return [{ id: action.id, title: action.page_title || action.source_url, dueAt, overdue: due < now }];
      });
    }
    const answers = latestReviewed ? await loadRunAnswers(viewer, latestReviewed.id) : [];
    const guidance = buildBaselineGuidance({
      website: context?.website,
      approvedQuestions: prompts.filter((prompt) => prompt.approved).length,
      providerAvailable: providers.some((provider) => provider.configured),
      newestRun: newest, observedRun: latestReviewed, answers,
      sourceCount: sources.length,
      reviewedSourceCount: sources.filter((source) => Boolean(source.reviewedAt)).length,
    });

    const comparable: ComparableChange[] = [];
    if (intelligence?.latest && intelligence.previous) {
      const delta = intelligence.latest.presence - intelligence.previous.presence;
      if (delta !== 0) comparable.push({ kind: "recommendation_presence_changed", delta, baselineRunId: intelligence.previous.id, currentRunId: intelligence.latest.id });
    } else if (intelligence?.latest && intelligence.changes.some((change) => /withheld/i.test(change.title))) {
      comparable.push({ kind: "comparison_withheld", reason: "The latest reviewed collection does not have an exact buyer-question/provider/model/methodology match yet.", baselineRunId: intelligence.latest.id, currentRunId: intelligence.latest.id });
    }

    const approvedQuestions = prompts.filter((prompt) => prompt.approved).length;
    const firstCollectionCompleted = Boolean(latestReviewed && latestReviewed.answers > 0 && answers.length === latestReviewed.answers);
    const firstRecordReviewed = guidance.recordReviewed;
    const comparableReviewedCycles = intelligence?.latest && intelligence.previous ? 2 : firstRecordReviewed ? 1 : 0;
    const activated = Boolean(context && approvedQuestions >= 5 && firstCollectionCompleted && firstRecordReviewed && firstActionCreated && firstActionAssigned);
    const activation = deriveActivationStage({
      workspaceConfigured: Boolean(context),
      approvedQuestions,
      firstCollectionCompleted,
      firstRecordReviewed,
      firstActionCreated,
      firstActionAssigned,
      comparableReviewedCycles,
    });
    const retentionHealth = deriveRetentionHealth({
      activated,
      secondComparableCycleCompleted: comparableReviewedCycles >= 2,
      scheduleEnabled,
      overdueActionCount: dueActions.filter((action) => action.overdue).length,
    });
    const onboardingComplete = guidance.complete;
    const activeRun = newest && ["queued", "running", "failed"].includes(newest.status)
      ? { id: newest.id, status: newest.status as "queued" | "running" | "failed", error: newest.errorSummary }
      : null;
    const items = deriveAttentionItems({
      onboardingComplete,
      setupStep: { title: guidance.next.label, detail: guidance.next.detail, href: guidance.next.href },
      activeRun,
      reviewBacklog: sources.filter((source) => !source.reviewedAt).length,
      dueActions,
      alerts: notifications.map((item) => ({ id: item.id, title: item.title, body: item.body, href: item.href, createdAt: item.createdAt, unread: !item.read })),
      comparison: comparable,
      scheduleEnabled,
    });
    if (guidance.noCitations) items.push({ id: "answer-only-evidence", kind: "review", priority: "normal", title: "No citations were returned", detail: "The answer remains inspectable. No source-backed opportunity or causal explanation is established.", href: latestReviewed ? `/app/runs/${encodeURIComponent(latestReviewed.id)}` : "/app/runs" });
    return NextResponse.json({ data: items, activation, retentionHealth, scheduleEnabled, onboardingComplete, mode: viewer.mode });
  } catch {
    return NextResponse.json({ error: "Attention is temporarily unavailable. Your saved records have not changed." }, { status: 503 });
  }
}
