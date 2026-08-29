import { estimateReservedRunCost, getProviderCostRates, safeOperationalError } from "@/lib/collection-policy";
import { currentObservationMethodologyVersion } from "@/lib/methodology-registry";
import { nextScheduleAt, scheduleIdempotencyKey } from "@/lib/measurement-schedules";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import { supabaseRest } from "@/lib/supabase-rest";
import { inngest } from "@/lib/jobs/inngest";

type LiveProviderId = Exclude<ProviderId, "mock">;
type DueSchedule = {
  id: string;
  organization_id: string;
  project_id: string | null;
  category_id: string | null;
  cadence: "weekly" | "biweekly" | "monthly";
  timezone: string;
  question_ids: string[];
  provider_ids: LiveProviderId[];
  model_snapshot: string | null;
  methodology_snapshot: string;
  locale: string;
  market: string;
  next_run_at: string;
  created_by: string | null;
};
type PromptRow = { id: string; prompt_key: string; prompt_text: string; locale: string; market?: string | null };

type PreparedRun = { runId: string; organizationId: string; scheduleId: string; nextRunAt: string };

async function prepareMeasurementSchedule(schedule: DueSchedule): Promise<PreparedRun | null> {
  // A schedule is a measurement contract. A methodology upgrade requires explicit
  // customer re-approval instead of silently generating incomparable observations.
  if (schedule.methodology_snapshot !== currentObservationMethodologyVersion()) return null;
  const providerId = schedule.provider_ids[0];
  if (!providerId || schedule.provider_ids.length !== 1 || !schedule.project_id || !schedule.category_id) return null;
  const provider = getProvider(providerId);
  const rates = getProviderCostRates(providerId);
  if (!provider.configured() || !rates) return null;
  const promptFilter = schedule.question_ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const monthStart = `${month}T00:00:00.000Z`;
  const [prompts, entitlementRows, activeRuns, monthlyUsage, monthlyRuns] = await Promise.all([
    supabaseRest<PromptRow[]>(`prompts?select=id,prompt_key,prompt_text,locale,market&organization_id=eq.${schedule.organization_id}&active=eq.true&id=in.(${encodeURIComponent(promptFilter)})`, { serviceRole: true }),
    supabaseRest<Array<{ monthly_run_units: number; monthly_ai_spend_cap_usd: number | string; status: string }>>(`organization_entitlements?select=monthly_run_units,monthly_ai_spend_cap_usd,status&organization_id=eq.${schedule.organization_id}&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ id: string }>>(`runs?select=id&organization_id=eq.${schedule.organization_id}&status=in.(queued,running)&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ units: number }>>(`usage_events?select=units&organization_id=eq.${schedule.organization_id}&period_start=eq.${month}`, { serviceRole: true }),
    supabaseRest<Array<{ actual_cost_usd: number | string; estimated_max_cost_usd: number | string; status: string; started_at: string | null }>>(`runs?select=actual_cost_usd,estimated_max_cost_usd,status,started_at&organization_id=eq.${schedule.organization_id}&created_at=gte.${encodeURIComponent(monthStart)}`, { serviceRole: true }),
  ]);
  const entitlement = entitlementRows[0];
  if (!entitlement || entitlement.status !== "active" || activeRuns.length || prompts.length !== schedule.question_ids.length) return null;
  const requestedUnits = prompts.length;
  const usedUnits = monthlyUsage.reduce((sum, row) => sum + Number(row.units || 0), 0);
  const reservedCost = estimateReservedRunCost(providerId, requestedUnits, rates);
  const reservedSpend = monthlyRuns.reduce((sum, row) => sum + (["failed", "cancelled"].includes(row.status) && !row.started_at ? 0 : Number(row.actual_cost_usd || row.estimated_max_cost_usd || 0)), 0);
  if (usedUnits + requestedUnits > entitlement.monthly_run_units || reservedSpend + reservedCost > Number(entitlement.monthly_ai_spend_cap_usd)) return null;

  const runId = crypto.randomUUID();
  const key = scheduleIdempotencyKey({ id: schedule.id, methodologySnapshot: schedule.methodology_snapshot, modelSnapshot: schedule.model_snapshot }, schedule.next_run_at);
  const activeRequestKey = `${providerId}:${prompts.map((prompt) => prompt.id).sort().join(",")}`;
  const nextRunAt = nextScheduleAt(schedule.next_run_at, schedule.cadence, schedule.timezone).toISOString();
  try {
    await supabaseRest("runs", {
      method: "POST", serviceRole: true, prefer: "return=minimal",
      body: {
        id: runId,
        organization_id: schedule.organization_id,
        project_id: schedule.project_id,
        category_id: schedule.category_id,
        status: "queued",
        provider_ids: [providerId],
        prompt_count: requestedUnits,
        requested_units: requestedUnits,
        estimated_max_cost_usd: reservedCost,
        idempotency_key: key,
        active_request_key: activeRequestKey,
        methodology_version: schedule.methodology_snapshot,
        created_by: schedule.created_by,
      },
    });
    await Promise.all([
      supabaseRest("run_prompt_selections", {
        method: "POST", serviceRole: true, prefer: "return=minimal",
        body: prompts.map((prompt) => ({
          organization_id: schedule.organization_id,
          run_id: runId,
          prompt_id: prompt.id,
          prompt_key: prompt.prompt_key,
          prompt_text: prompt.prompt_text,
          locale: prompt.locale || schedule.locale,
          market: prompt.market || schedule.market,
        })),
      }),
      supabaseRest("usage_events", {
        method: "POST", serviceRole: true, prefer: "return=minimal",
        body: { organization_id: schedule.organization_id, meter: "provider_prompt_observation", units: requestedUnits, period_start: month, run_id: runId },
      }),
    ]);
    await supabaseRest(`measurement_schedules?id=eq.${schedule.id}&organization_id=eq.${schedule.organization_id}`, {
      method: "PATCH", serviceRole: true, prefer: "return=minimal",
      body: { last_run_at: schedule.next_run_at, last_run_id: runId, next_run_at: nextRunAt },
    });
    return { runId, organizationId: schedule.organization_id, scheduleId: schedule.id, nextRunAt };
  } catch (error) {
    // Idempotency/active-run conflicts are safe skips. Any partial reservation is
    // removed so a scheduler retry cannot consume quota without a run.
    await supabaseRest(`usage_events?organization_id=eq.${schedule.organization_id}&run_id=eq.${runId}`, { method: "DELETE", serviceRole: true }).catch(() => undefined);
    await supabaseRest(`runs?id=eq.${runId}&organization_id=eq.${schedule.organization_id}`, { method: "DELETE", serviceRole: true }).catch(() => undefined);
    console.warn("Measurement schedule preparation failed.", safeOperationalError(error));
    return null;
  }
}

export const dispatchMeasurementSchedules = inngest.createFunction(
  {
    id: "dispatch-measurement-schedules",
    retries: 2,
    triggers: { cron: "17 * * * *" },
  },
  async ({ step }) => {
    const now = new Date().toISOString();
    const schedules = await step.run("load-due-measurement-schedules", () =>
      supabaseRest<DueSchedule[]>(`measurement_schedules?select=id,organization_id,project_id,category_id,cadence,timezone,question_ids,provider_ids,model_snapshot,methodology_snapshot,locale,market,next_run_at,created_by&enabled=eq.true&next_run_at=lte.${encodeURIComponent(now)}&order=next_run_at.asc&limit=100`, { serviceRole: true }),
    );
    const queued: Array<{ runId: string; organizationId: string }> = [];
    for (const schedule of schedules) {
      const prepared = await step.run(`prepare-measurement-schedule-${schedule.id}`, () => prepareMeasurementSchedule(schedule));
      if (prepared) queued.push({ runId: prepared.runId, organizationId: prepared.organizationId });
    }
    if (queued.length) await step.sendEvent("queue-measurement-schedule-runs", queued.map((data) => ({ id: `foremention-schedule-${data.runId}`, name: "foremention/run.requested", data })));
    return { due: schedules.length, queued: queued.length };
  },
);
