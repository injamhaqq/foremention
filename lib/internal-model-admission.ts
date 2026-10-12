/**
 * Shared fail-closed admission for INTERNAL model work (A29 / CV-07, Chat01).
 *
 * Internal work is anything a provider is asked to do that is not a customer
 * measurement observation, for example onboarding profile enrichment. Every
 * attempt, including any retry, must call `admitInternalModelCall` and must
 * not touch the network unless it returns `admitted: true`.
 *
 * Order of checks (first failure wins, all before any network call):
 *   1. free-only policy  - providerAllowedForInternalModelWork (Cloudflare only by default)
 *   2. operator opt-in   - a positive per-purpose daily cap env; unset/0 = disabled
 *   3. provider configured
 *   4. durable admission - atomic UTC-day counter in the evidence-capacity D1 store;
 *                          no store => denied (never admitted uncapped)
 *
 * A denial is a normal outcome: callers skip the work and keep the manual or
 * metadata-only path. It is never converted into a different provider/model.
 */
import { admitNamedCapacityUnit } from "./evidence-capacity.ts";
import { providerAllowedForInternalModelWork } from "./free-provider-mode.ts";
import type { ProviderId } from "./providers/types.ts";

export type InternalModelPurpose = "onboarding-enrichment";

export type InternalModelDenialReason =
  | "FREE_ONLY_MODE"
  | "NOT_ENABLED"
  | "PROVIDER_NOT_CONFIGURED"
  | "CAPACITY_EXHAUSTED"
  | "CAPACITY_UNVERIFIED";

export type InternalModelAdmission =
  | { admitted: true; provider: ProviderId; purpose: InternalModelPurpose; periodKey: string; dailyCap: number; admittedAt: string }
  | { admitted: false; provider: ProviderId; purpose: InternalModelPurpose; reason: InternalModelDenialReason };

const CAP_ENV: Record<InternalModelPurpose, string> = {
  "onboarding-enrichment": "FOREMENTION_ONBOARDING_ENRICHMENT_DAILY_CAP",
};

/** Hard ceiling so a typo cannot open an effectively uncapped paid lane. */
export const INTERNAL_MODEL_DAILY_CAP_CEILING = 50;

export function internalModelDailyCap(purpose: InternalModelPurpose, env: Record<string, string | undefined> = process.env) {
  const raw = env[CAP_ENV[purpose]]?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, INTERNAL_MODEL_DAILY_CAP_CEILING) : 0;
}

export async function admitInternalModelCall(input: {
  provider: Exclude<ProviderId, "mock">;
  purpose: InternalModelPurpose;
  configured: boolean;
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<InternalModelAdmission> {
  const { provider, purpose } = input;
  const deny = (reason: InternalModelDenialReason): InternalModelAdmission => ({ admitted: false, provider, purpose, reason });
  if (!providerAllowedForInternalModelWork(provider)) return deny("FREE_ONLY_MODE");
  const dailyCap = internalModelDailyCap(purpose, input.env);
  if (dailyCap <= 0) return deny("NOT_ENABLED");
  if (!input.configured) return deny("PROVIDER_NOT_CONFIGURED");
  const now = input.now || new Date();
  const periodKey = `internal:${purpose}:${provider}:day:${now.toISOString().slice(0, 10)}`;
  const result = await admitNamedCapacityUnit({ key: periodKey, cap: dailyCap, requireStore: true });
  if (!result.admitted) return deny(result.reason === "CAP_EXHAUSTED" ? "CAPACITY_EXHAUSTED" : "CAPACITY_UNVERIFIED");
  return { admitted: true, provider, purpose, periodKey, dailyCap, admittedAt: now.toISOString() };
}
