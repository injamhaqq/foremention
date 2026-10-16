import { NextResponse } from "next/server";
import { getViewer, requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadPrompts, loadProviderStatuses, loadWorkspaceContext } from "@/lib/data";
import { currentObservationMethodologyVersion } from "@/lib/methodology-registry";
import { nextScheduleAt, validateMeasurementSchedule, type MeasurementCadence } from "@/lib/measurement-schedules";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

type ScheduleRow = {
  id: string;
  cadence: MeasurementCadence;
  timezone: string;
  question_ids: string[];
  provider_ids: string[];
  model_snapshot: string | null;
  methodology_snapshot: string;
  locale: string;
  market: string;
  enabled: boolean;
  schedule_origin?: "trial" | "paid" | "manual" | "legacy_unknown";
  trial_ends_at?: string | null;
  next_run_at: string;
  last_run_at: string | null;
  last_run_id: string | null;
};

const canManage = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ data: [] });
  try {
    const [data, entitlements] = await Promise.all([
      supabaseRest<ScheduleRow[]>(
        `measurement_schedules?select=id,cadence,timezone,question_ids,provider_ids,model_snapshot,methodology_snapshot,locale,market,enabled,next_run_at,last_run_at,last_run_id,schedule_origin,trial_ends_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc`,
        { token: viewer.accessToken },
      ),
      supabaseRest<Array<{ status: string; billing_source: string | null; expires_at: string | null }>>(
        `organization_entitlements?select=status,billing_source,expires_at&organization_id=eq.${context.organizationId}&limit=1`,
        { token: viewer.accessToken },
      ),
    ]);
    const entitlement = entitlements[0];
    const now = Date.now();
    const view = data.map((schedule) => {
      const origin = schedule.schedule_origin || "legacy_unknown";
      let dispatchState: "paused" | "needs_review" | "trial_expired" | "plan_changed" | "model_changed" | "configured" = "configured";
      if (!schedule.enabled) dispatchState = "paused";
      else if (origin === "legacy_unknown" || !schedule.model_snapshot?.trim()) dispatchState = "needs_review";
      else if (origin === "trial" && (
        entitlement?.billing_source !== "trial" || entitlement.status !== "active" ||
        !schedule.trial_ends_at || !entitlement.expires_at ||
        Math.min(new Date(schedule.trial_ends_at).getTime(), new Date(entitlement.expires_at).getTime()) <= now + 2 * 3_600_000
      )) dispatchState = "trial_expired";
      else if (origin === "paid" && (
        entitlement?.status !== "active" ||
        !["paddle", "stripe", "creem"].includes(entitlement.billing_source || "") ||
        (entitlement.expires_at && new Date(entitlement.expires_at).getTime() <= now)
      )) dispatchState = "plan_changed";
      else if (!schedule.provider_ids?.length || schedule.model_snapshot !== String(process.env[`${schedule.provider_ids[0].toUpperCase()}_MODEL`] || "").trim())
        dispatchState = "model_changed";
      return { ...schedule, dispatch_state: dispatchState };
    });
    return NextResponse.json({ data: view });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ data: [], migrationPending: true });
    throw error;
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/settings");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage measurement schedules." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as {
    cadence?: MeasurementCadence;
    timezone?: string;
    questionIds?: string[];
    providerIds?: string[];
    locale?: string;
    market?: string;
    enabled?: boolean;
  };
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Complete onboarding before enabling recurring measurement." }, { status: 409 });
  const [questions, providers] = await Promise.all([loadPrompts(viewer), loadProviderStatuses(viewer)]);
  const approvedQuestions = questions.filter((question) => question.approved);
  const configuredProviders = providers.filter((provider) => viewer.mode === "demo" || provider.configured);
  const approved = new Set(approvedQuestions.map((question) => question.id));
  const configured = new Set<string>(configuredProviders.map((provider) => provider.id));
  const questionIds = Array.isArray(body.questionIds) && body.questionIds.length ? body.questionIds : approvedQuestions.slice(0, 5).map((question) => question.id);
  const providerIds = Array.isArray(body.providerIds) && body.providerIds.length ? body.providerIds : configuredProviders.slice(0, 1).map((provider) => provider.id);
  if (questionIds.some((id) => !approved.has(id))) return NextResponse.json({ error: "Schedules can use only approved workspace buyer questions." }, { status: 400 });
  if (providerIds.length !== 1 || providerIds.some((id) => !configured.has(id))) return NextResponse.json({ error: "Choose exactly one connected provider so repeat measurements stay interpretable." }, { status: 400 });
  // Saving this form is an explicit manual authorization, not a claim that
  // an earlier run was comparable. Require a resolved model before dispatch.
  const configuredModel = String(process.env[(providerIds[0] || "").toUpperCase() + "_MODEL"] || "").trim();
  if (!configuredModel) return NextResponse.json({ error: "The exact provider model is unavailable. Configure and verify it before saving a repeat." }, { status: 409 });
  let schedule;
  try {
    schedule = validateMeasurementSchedule({
      cadence: body.cadence || "weekly",
      timezone: body.timezone || "UTC",
      questionIds,
      providerIds,
      modelSnapshot: configuredModel,
      methodologySnapshot: currentObservationMethodologyVersion(),
      locale: body.locale || "en-US",
      market: body.market || "global",
      enabled: body.enabled !== false,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid measurement schedule." }, { status: 400 });
  }
  const nextRunAt = nextScheduleAt(new Date(), schedule.cadence, schedule.timezone).toISOString();
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: "demo-measurement-schedule", ...schedule, next_run_at: nextRunAt }, mode: "demo" });
  const rows = await supabaseRest<ScheduleRow[]>("measurement_schedules", {
    method: "POST",
    serviceRole: true,
    prefer: "return=representation",
    body: {
      organization_id: context.organizationId,
      project_id: context.projectId,
      category_id: context.categoryId,
      cadence: schedule.cadence,
      timezone: schedule.timezone,
      question_ids: schedule.questionIds,
      provider_ids: schedule.providerIds,
      model_snapshot: schedule.modelSnapshot,
      methodology_snapshot: schedule.methodologySnapshot,
      locale: schedule.locale,
      market: schedule.market,
      enabled: schedule.enabled,
      next_run_at: nextRunAt,
      created_by: viewer.id,
      schedule_origin: "manual",
      baseline_contract_json: { type: "manual", confirmed_by: viewer.id, confirmed_at: new Date().toISOString(), provider: providerIds[0], model: configuredModel, question_ids: questionIds },
    },
  });
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/settings");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot manage measurement schedules." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: string; enabled?: boolean };
  if (!body.id || typeof body.enabled !== "boolean") return NextResponse.json({ error: "Schedule id and enabled state are required." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: body.id, enabled: body.enabled }, mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const rows = await supabaseRest<ScheduleRow[]>(`measurement_schedules?id=eq.${encodeURIComponent(body.id)}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, {
    method: "PATCH",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: { enabled: body.enabled },
  });
  if (!rows.length) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}
