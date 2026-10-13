/**
 * Platform-wide live-evidence admission (A18).
 *
 * Every grounded evidence call spends shared free allocations: Workers AI on
 * the Workers Free plan (10,000 neurons/day, reset 00:00 UTC) and, when the
 * commercial Brave Search key is configured, Brave's monthly free credit
 * (~1,000 requests; beyond it Brave charges the card on file). This module
 * admits each call atomically against a UTC-daily cap and, for Brave, a
 * UTC-monthly cap, so work stops BEFORE a new cash charge instead of after.
 *
 * Storage is the Worker's D1 database (single-writer, so each conditional
 * upsert below is atomic across concurrent requests). When the Worker marks
 * the store as required but it is unavailable or errors, admission fails
 * closed. Limits are env-configurable and bounded; invalid values fall back
 * to the defaults rather than widening the cap.
 */

export interface EvidenceCapacityStatement {
  bind(...values: unknown[]): EvidenceCapacityStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface EvidenceCapacityStore {
  prepare(query: string): EvidenceCapacityStatement;
}

export const EVIDENCE_CAPACITY_DEFAULTS = {
  /** Grounded calls per UTC day (all retrieval providers). ~45 neurons each -> well under 10k. */
  dailyCalls: 100,
  /** Brave Search requests per UTC month; stays under the ~1,000-request $5 free credit. */
  monthlyBraveCalls: 900,
} as const;

export const evidenceCapacityTable = `
CREATE TABLE IF NOT EXISTS evidence_capacity_counters (
  period_key TEXT PRIMARY KEY,
  used INTEGER NOT NULL
)
`;

export class EvidenceCapacityExhaustedError extends Error {
  readonly scope: "daily" | "monthly" | "unavailable";
  constructor(scope: "daily" | "monthly" | "unavailable", message: string) {
    super(message);
    this.name = "EvidenceCapacityExhaustedError";
    this.scope = scope;
  }
}

type LimitEnv = Record<string, string | undefined>;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

/** 0 is a valid operator setting: it pauses all live evidence work. */
export function evidenceCapacityLimits(env: LimitEnv = process.env) {
  return {
    dailyCalls: boundedInteger(env.FOREMENTION_DAILY_EVIDENCE_CALL_CAP, EVIDENCE_CAPACITY_DEFAULTS.dailyCalls, 0, 100_000),
    monthlyBraveCalls: boundedInteger(env.FOREMENTION_MONTHLY_BRAVE_CALL_CAP, EVIDENCE_CAPACITY_DEFAULTS.monthlyBraveCalls, 0, 1_000_000),
  };
}

export function evidencePeriodKeys(now = new Date()) {
  const iso = now.toISOString();
  return { day: `day:${iso.slice(0, 10)}`, braveMonth: `brave-month:${iso.slice(0, 7)}` };
}

const runtime = globalThis as typeof globalThis & {
  __FOREMENTION_EVIDENCE_CAPACITY__?: { store: EvidenceCapacityStore | null; required: boolean; initialized?: boolean };
};

/**
 * Called by the Worker on every request. `required` is true in the deployed
 * Worker, so a missing D1 binding fails closed rather than running uncapped.
 */
export function setEvidenceCapacityStore(store: EvidenceCapacityStore | null | undefined, required = true) {
  const current = runtime.__FOREMENTION_EVIDENCE_CAPACITY__;
  if (current && current.store === (store || null) && current.required === required) return;
  runtime.__FOREMENTION_EVIDENCE_CAPACITY__ = { store: store || null, required };
}

function registered() {
  return runtime.__FOREMENTION_EVIDENCE_CAPACITY__ || null;
}

async function ensureTable(state: { store: EvidenceCapacityStore | null; initialized?: boolean }) {
  if (!state.store || state.initialized) return;
  await state.store.prepare(evidenceCapacityTable).run();
  state.initialized = true;
}

const ADMIT_SQL = "INSERT INTO evidence_capacity_counters (period_key, used) VALUES (?, 1) "
  + "ON CONFLICT(period_key) DO UPDATE SET used = used + 1 WHERE used < ? RETURNING used";
const RELEASE_SQL = "UPDATE evidence_capacity_counters SET used = used - 1 WHERE period_key = ? AND used > 0";

async function admitOne(store: EvidenceCapacityStore, key: string, cap: number) {
  if (cap <= 0) return false;
  const row = await store.prepare(ADMIT_SQL).bind(key, cap).first<{ used: number }>();
  return Boolean(row && typeof row.used === "number" && row.used <= cap);
}

export const EVIDENCE_CAPACITY_DAILY_MESSAGE = "Today's live-evidence capacity is used up. No new provider calls were made and nothing was charged; collection resumes after 00:00 UTC.";
export const EVIDENCE_CAPACITY_MONTHLY_MESSAGE = "This month's free search-retrieval allowance is used up. Live evidence is paused before any paid search charge; it resumes next month or when the operator raises the cap.";
export const EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE = "Live-evidence capacity could not be verified, so no provider call was made.";

/**
 * Admit one grounded evidence call or throw EvidenceCapacityExhaustedError.
 * Without a registered store (unit tests, local scripts) admission is a no-op.
 */
export async function admitEvidenceCall(input: { brave: boolean; now?: Date; env?: LimitEnv }) {
  const state = registered();
  if (!state) return { admitted: true as const, enforced: false as const };
  if (!state.store) {
    if (state.required) throw new EvidenceCapacityExhaustedError("unavailable", EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE);
    return { admitted: true as const, enforced: false as const };
  }
  const limits = evidenceCapacityLimits(input.env);
  const keys = evidencePeriodKeys(input.now);
  const store = state.store;
  try {
    await ensureTable(state);
    if (input.brave && !await admitOne(store, keys.braveMonth, limits.monthlyBraveCalls)) {
      throw new EvidenceCapacityExhaustedError("monthly", EVIDENCE_CAPACITY_MONTHLY_MESSAGE);
    }
    if (!await admitOne(store, keys.day, limits.dailyCalls)) {
      if (input.brave) await store.prepare(RELEASE_SQL).bind(keys.braveMonth).run().catch(() => undefined);
      throw new EvidenceCapacityExhaustedError("daily", EVIDENCE_CAPACITY_DAILY_MESSAGE);
    }
  } catch (error) {
    if (error instanceof EvidenceCapacityExhaustedError) throw error;
    throw new EvidenceCapacityExhaustedError("unavailable", EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE);
  }
  return { admitted: true as const, enforced: true as const };
}

export type EvidenceCapacitySnapshot = {
  enforced: boolean;
  braveConfigured: boolean;
  day: string;
  dailyCap: number;
  dailyUsed: number | null;
  dailyRemaining: number | null;
  month: string;
  monthlyBraveCap: number;
  monthlyBraveUsed: number | null;
  monthlyBraveRemaining: number | null;
};

/** Operator readout. Never throws; unknown usage is reported as null, not zero. */
export async function readEvidenceCapacity(input: { brave: boolean; now?: Date; env?: LimitEnv }): Promise<EvidenceCapacitySnapshot> {
  const limits = evidenceCapacityLimits(input.env);
  const keys = evidencePeriodKeys(input.now);
  const snapshot: EvidenceCapacitySnapshot = {
    enforced: false,
    braveConfigured: input.brave,
    day: keys.day.slice(4),
    dailyCap: limits.dailyCalls,
    dailyUsed: null,
    dailyRemaining: null,
    month: keys.braveMonth.slice(12),
    monthlyBraveCap: limits.monthlyBraveCalls,
    monthlyBraveUsed: null,
    monthlyBraveRemaining: null,
  };
  const state = registered();
  if (!state?.store) return snapshot;
  try {
    await ensureTable(state);
    const read = async (key: string) => {
      const row = await state.store!.prepare("SELECT used FROM evidence_capacity_counters WHERE period_key = ?").bind(key).first<{ used: number }>();
      return row && typeof row.used === "number" ? row.used : 0;
    };
    const [daily, monthly] = await Promise.all([read(keys.day), read(keys.braveMonth)]);
    snapshot.enforced = true;
    snapshot.dailyUsed = daily;
    snapshot.dailyRemaining = Math.max(0, limits.dailyCalls - daily);
    snapshot.monthlyBraveUsed = monthly;
    snapshot.monthlyBraveRemaining = Math.max(0, limits.monthlyBraveCalls - monthly);
  } catch {
    // Leave usage unknown.
  }
  return snapshot;
}

/**
 * A29/CV-07 (Chat01): admit one unit against a named durable counter in the
 * same D1 store and atomic upsert used for live evidence. Unlike
 * admitEvidenceCall, a caller can require the store: internal model work that
 * may cost money is DENIED (not admitted uncapped) when no store is
 * registered, as in local scripts, unit tests or a misconfigured Worker.
 */
export async function admitNamedCapacityUnit(input: { key: string; cap: number; requireStore: boolean }) {
  if (!/^[a-z0-9:._-]{3,120}$/.test(input.key)) return { admitted: false as const, reason: "INVALID_KEY" as const };
  if (!Number.isSafeInteger(input.cap) || input.cap <= 0) return { admitted: false as const, reason: "CAP_ZERO" as const };
  const state = registered();
  if (!state?.store) {
    return input.requireStore
      ? { admitted: false as const, reason: "STORE_UNAVAILABLE" as const }
      : { admitted: true as const, enforced: false as const };
  }
  try {
    await ensureTable(state);
    if (!await admitOne(state.store, input.key, input.cap)) return { admitted: false as const, reason: "CAP_EXHAUSTED" as const };
  } catch {
    return { admitted: false as const, reason: "STORE_UNAVAILABLE" as const };
  }
  return { admitted: true as const, enforced: true as const };
}
