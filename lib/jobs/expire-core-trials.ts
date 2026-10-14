import { supabaseRest } from "@/lib/supabase-rest";

/**
 * Return lapsed 7-day Core trials to the free plan (service role only).
 * Runs with the hourly Worker backup cron; idempotent.
 */
export async function expireCoreTrials(): Promise<number> {
  const result = await supabaseRest<number>("rpc/expire_core_trials", { method: "POST", serviceRole: true, body: {} });
  return typeof result === "number" ? result : 0;
}
