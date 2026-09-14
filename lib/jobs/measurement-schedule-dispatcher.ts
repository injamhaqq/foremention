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
type EntitlementRow = { status: string; expires_at: string | null };
type OperatorRow = { role: string };
type ExistingRunRow = { id: string; status: string; estimated_max_cost_usd: number | string; requested_units: number };

type PreparedRun = {
  runId: string;
  organizationId: string;
  scheduleId: string;
  scheduledFor: string;
  nextRunAt: string;
  shouldDispatch: boolean;
};

const isOperatorRole = (role: string) => ["owner", "admin", "analyst"].includes(role);

async function releaseScheduledCandidate(schedule: DueSchedule, runId: string, reason: unknown) {
  if (!schedule.created_by) return;
  await supabaseRest("rpc/release_queued_run_server", {
    method: "POST",
    serviceRole: true,
    body: {
      p_organization_id: schedule.organization_id,
      p_run_id: runId,
      p_reason: safeOperationalError(reason),
      p_actor_id: schedule.created_by,
    },
  }).catch(() => undefined);
  // Scheduled idempotency keys represent a cadence occurrence. A pre-dispatch
  // failure must be retryable on the next dispatcher pass, so the failed audit
  // row is preserved while its uniqueness keys are released.
  await supabaseRest(`runs?id=eq.${runId}&organization_id=eq.${schedule.organization_id}&status=in.(failed,cancelled)`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: { idempotency_key: null, active_request_key: null },
  }).catch(() => undefined);
}

async function prepareMeasurementSchedule(schedule: DueSchedule): Promise<PreparedRun | null> {
  // A schedule is a measurement contract. A methodology upgrade requires explicit
  // customer re-approval instead of silently generating incomparable observations.
  if (schedule.methodology_snapshot !== currentObservationMethodologyVersion()) return null;
  if (!schedule.created_by) return null;
  const providerId = schedule.provider_ids[0];
  if (!providerId || schedule.provider_ids.length !== 1 || !schedule.project_id || !schedule.category_id) return null;
  const provider = getProvider(providerId);
  const rates = getProviderCostRates(providerId);
  if (!provider.configured() || !rates) return null;

  const key = scheduleIdempotencyKey({
    id: schedule.id,
    methodologySnapshot: schedule.methodology_snapshot,
    modelSnapshot: schedule.model_snapshot,
  }, schedule.next_run_at);
  const nextRunAt = nextScheduleAt(schedule.next_run_at, schedule.cadence, schedule.timezone).toISOString();
  const [operatorRows, entitlementRows, existingRuns] = await Promise.all([
    supabaseRest<OperatorRow[]>(`organization_members?select=role&organization_id=eq.${schedule.organization_id}&user_id=eq.${schedule.created_by}&limit=1`, { serviceRole: true }),
    supabaseRest<EntitlementRow[]>(`organization_entitlements?select=status,expires_at&organization_id=eq.${schedule.organization_id}&limit=1`, { serviceRole: true }),
    supabaseRest<ExistingRunRow[]>(`runs?select=id,status,estimated_max_cost_usd,requested_units&organization_id=eq.${schedule.organization_id}&idempotency_key=eq.${encodeURIComponent(key)}&limit=1`, { serviceRole: true }),
  ]);
  const operator = operatorRows[0];
  const entitlement = entitlementRows[0];
  const entitlementExpiry = entitlement?.expires_at ? new Date(entitlement.expires_at) : null;
  if (
    !operator
    || !isOperatorRole(operator.role)
    || !entitlement
    || entitlement.status !== "active"
    || (entitlementExpiry && (!Number.isFinite(entitlementExpiry.getTime()) || entitlementExpiry <= new Date()))
  ) return null;

  const existing = existingRuns[0];
  if (existing && !["failed", "cancelled"].includes(existing.status)) {
    if (existing.status !== "queued" || Number(existing.estimated_max_cost_usd) > 0) {
      return {
        runId: existing.id,
        organizationId: schedule.organization_id,
        scheduleId: schedule.id,
        scheduledFor: schedule.next_run_at,
        nextRunAt,
        shouldDispatch: existing.status === "queued",
      };
    }
    // A previous attempt may have stopped after creating the zero-cost candidate.
    // Rebuild the immutable prompt snapshot, then re-run idempotent reservations.
  } else if (existing) {
    await supabaseRest(`runs?id=eq.${existing.id}&organization_id=eq.${schedule.organization_id}`, {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: { idempotency_key: null, active_request_key: null },
    });
  }

  const promptFilter = schedule.question_ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
  const prompts = await supabaseRest<PromptRow[]>(
    `prompts?select=id,prompt_key,prompt_text,locale,market&organization_id=eq.${schedule.organization_id}&active=eq.true&id=in.(${encodeURIComponent(promptFilter)})`,
    { serviceRole: true },
  );
  if (prompts.length !== schedule.question_ids.length) return null;

  const requestedUnits = prompts.length;
  const reservedCost = estimateReservedRunCost(providerId, requestedUnits, rates);
  const runId = existing && existing.status === "queued" ? existing.id : crypto.randomUUID();
  const activeRequestKey = `${providerId}:${prompts.map((prompt) => prompt.id).sort().join(",")}`;
  const reusingCandidate = Boolean(existing && existing.status === "queued");
  try {
    if (!reusingCandidate) {
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
          estimated_max_cost_usd: 0,
          idempotency_key: key,
          active_request_key: activeRequestKey,
          methodology_version: schedule.methodology_snapshot,
          created_by: schedule.created_by,
        },
      });
    } else {
      await supabaseRest(`run_prompt_selections?organization_id=eq.${schedule.organization_id}&run_id=eq.${runId}`, {
        method: "DELETE", serviceRole: true,
      });
    }

    await supabaseRest("run_prompt_selections", {
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
    });
    await supabaseRest("rpc/reserve_run_quota_server", {
      method: "POST",
      serviceRole: true,
      body: {
        p_organization_id: schedule.organization_id,
        p_units: requestedUnits,
        p_run_id: runId,
        p_actor_id: schedule.created_by,
      },
    });
    await supabaseRest("rpc/reserve_run_budget_server", {
      method: "POST",
      serviceRole: true,
      body: {
        p_organization_id: schedule.organization_id,
        p_run_id: runId,
        p_estimated_max_cost_usd: reservedCost,
        p_actor_id: schedule.created_by,
      },
    });
    return {
      runId,
      organizationId: schedule.organization_id,
      scheduleId: schedule.id,
      scheduledFor: schedule.next_run_at,
      nextRunAt,
      shouldDispatch: true,
    };
  } catch (error) {
    await releaseScheduledCandidate(schedule, runId, error);
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
    const preparedRuns: PreparedRun[] = [];
    for (const schedule of schedules) {
      const prepared = await step.run(`prepare-measurement-schedule-${schedule.id}`, () => prepareMeasurementSchedule(schedule));
      if (prepared) preparedRuns.push(prepared);
    }

    let dispatched = 0;
    for (const data of preparedRuns) {
      if (data.shouldDispatch) {
        await step.sendEvent(`queue-measurement-schedule-run-${data.runId}`, {
          id: `foremention-schedule-${data.runId}`,
          name: "foremention/run.requested",
          data: { runId: data.runId, organizationId: data.organizationId },
        });
        dispatched += 1;
      }
      // Keep the cadence due until event dispatch has durably succeeded. If this
      // patch needs a retry, the deterministic run/event ids recover without a
      // second provider call.
      await step.run(`advance-measurement-schedule-${data.scheduleId}-${data.runId}`, () =>
        supabaseRest(`measurement_schedules?id=eq.${data.scheduleId}&organization_id=eq.${data.organizationId}&next_run_at=eq.${encodeURIComponent(data.scheduledFor)}`, {
          method: "PATCH", serviceRole: true, prefer: "return=minimal",
          body: { last_run_at: data.scheduledFor, last_run_id: data.runId, next_run_at: data.nextRunAt },
        }),
      );
    }
    return { due: schedules.length, queued: dispatched, advanced: preparedRuns.length };
  },
);
