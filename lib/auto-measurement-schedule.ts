import { currentObservationMethodologyVersion } from "@/lib/methodology-registry";
import { nextScheduleAt, validateMeasurementSchedule } from "@/lib/measurement-schedules";
import { supabaseRest } from "@/lib/supabase-rest";
import { autoScheduleCadence, type AutoScheduleEntitlement } from "@/lib/product-limits";

export { autoScheduleCadence, type AutoScheduleEntitlement };

/**
 * Best effort: create the project's recurring schedule when none exists yet.
 * Never blocks or fails the collection that triggered it.
 */
export async function ensureAutoMeasurementSchedule(input: {
  entitlement: AutoScheduleEntitlement | null | undefined;
  organizationId: string;
  projectId: string;
  categoryId: string;
  questionIds: string[];
  providerId: string;
  actorId: string;
  token?: string;
}): Promise<"created" | "exists" | "not_eligible" | "failed"> {
  const cadence = autoScheduleCadence(input.entitlement);
  if (!cadence) return "not_eligible";
  try {
    const existing = await supabaseRest<Array<{ id: string }>>(
      `measurement_schedules?select=id&organization_id=eq.${input.organizationId}&project_id=eq.${input.projectId}&limit=1`,
      { token: input.token },
    );
    if (existing.length) return "exists";
    const schedule = validateMeasurementSchedule({
      cadence,
      timezone: "UTC",
      questionIds: input.questionIds,
      providerIds: [input.providerId],
      modelSnapshot: null,
      methodologySnapshot: currentObservationMethodologyVersion(),
      locale: "en-US",
      market: "global",
      enabled: true,
    });
    await supabaseRest("measurement_schedules", {
      method: "POST",
      token: input.token,
      prefer: "return=minimal",
      body: {
        organization_id: input.organizationId,
        project_id: input.projectId,
        category_id: input.categoryId,
        cadence: schedule.cadence,
        timezone: schedule.timezone,
        question_ids: schedule.questionIds,
        provider_ids: schedule.providerIds,
        model_snapshot: schedule.modelSnapshot,
        methodology_snapshot: schedule.methodologySnapshot,
        locale: schedule.locale,
        market: schedule.market,
        enabled: true,
        next_run_at: nextScheduleAt(new Date(), schedule.cadence, schedule.timezone).toISOString(),
        created_by: input.actorId,
      },
    });
    return "created";
  } catch {
    return "failed";
  }
}
