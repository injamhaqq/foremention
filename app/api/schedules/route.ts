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
    const data = await supabaseRest<ScheduleRow[]>(`measurement_schedules?select=id,cadence,timezone,question_ids,provider_ids,model_snapshot,methodology_snapshot,locale,market,enabled,next_run_at,last_run_at,last_run_id&organization_id=eq.${context.organizationId}&order=created_at.desc`, { token: viewer.accessToken });
    return NextResponse.json({ data });
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
  let schedule;
  try {
    schedule = validateMeasurementSchedule({
      cadence: body.cadence || "weekly",
      timezone: body.timezone || "UTC",
      questionIds,
      providerIds,
      modelSnapshot: null,
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
    token: viewer.accessToken,
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
  const rows = await supabaseRest<ScheduleRow[]>(`measurement_schedules?id=eq.${encodeURIComponent(body.id)}&organization_id=eq.${context.organizationId}`, {
    method: "PATCH",
    token: viewer.accessToken,
    prefer: "return=representation",
    body: { enabled: body.enabled },
  });
  if (!rows.length) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}
