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
 *
 * FM-01 (capacity track): the global limits are now ONE ceiling split into
 * separate pools, and every customer call is also admitted per workspace:
 *
 *   - customer pool: paying, trial and free workspaces. Its share is the global
 *     ceiling minus the public and canary reserves, so the free /score tool, the
 *     public prompt check, unclassified callers and the canary can never spend it.
 *   - public pool:   free public tools (/score, prompt check) and any caller that
 *     does not say who it is (fail-safe default).
 *   - canary pool:   the production first-evidence canary workspace(s).
 *   - demo:          never admitted. The fictional demo must not reach a provider.
 *
 * Inside the customer pool each workspace has its own UTC-daily and UTC-monthly
 * allowance sized by its plan (free / trial / core / signal / manual grant), and
 * free workspaces additionally share one bounded free-workspace share so a crowd
 * of free signups cannot exhaust what paying workspaces need. Every key is a
 * separate atomic counter in the same D1 table; a refusal at any level releases
 * the units already taken for that call.
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

/** Reserved slices of the global ceiling (FM-01). Each is clamped so the reserves never take more than half of it. */
export const EVIDENCE_POOL_DEFAULTS = {
  public: { dailyCalls: 15, monthlyBraveCalls: 120 },
  canary: { dailyCalls: 10, monthlyBraveCalls: 40 },
  /** Shared by every FREE workspace inside the customer pool (paid and trial workspaces never draw on it). */
  freeWorkspaces: { dailyCalls: 25, monthlyCalls: 150 },
} as const;

export type EvidencePlanTier = "free" | "trial" | "core" | "signal" | "manual";

/**
 * Per-workspace allowances. Daily = 2 x the plan's per-run question ceiling (one
 * full run plus provider retries); monthly = 2 x the plan's monthly run units
 * (PACKAGE_CAPACITY / CORE_TRIAL_CAPACITY / Foundation access in product-limits).
 */
export const WORKSPACE_EVIDENCE_CAPACITY_DEFAULTS: Record<EvidencePlanTier, { dailyCalls: number; monthlyCalls: number }> = {
  free: { dailyCalls: 10, monthlyCalls: 30 },
  trial: { dailyCalls: 50, monthlyCalls: 100 },
  core: { dailyCalls: 50, monthlyCalls: 200 },
  signal: { dailyCalls: 200, monthlyCalls: 2000 },
  manual: { dailyCalls: 50, monthlyCalls: 200 },
};

export type EvidenceCapacityContext =
  | { pool: "customer"; organizationId: string; tier: EvidencePlanTier; runId?: string | null }
  | { pool: "public"; label?: string }
  | { pool: "canary"; organizationId?: string | null; runId?: string | null }
  | { pool: "demo" };

export const PUBLIC_EVIDENCE_CONTEXT: EvidenceCapacityContext = { pool: "public" };

export const evidenceCapacityTable = `
CREATE TABLE IF NOT EXISTS evidence_capacity_counters (
  period_key TEXT PRIMARY KEY,
  used INTEGER NOT NULL
)
`;

export type EvidenceCapacityScope = "daily" | "monthly" | "unavailable" | "workspace_daily" | "workspace_monthly" | "demo";

export class EvidenceCapacityExhaustedError extends Error {
  readonly scope: EvidenceCapacityScope;
  constructor(scope: EvidenceCapacityScope, message: string) {
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

type PoolShare = { dailyCalls: number; monthlyBraveCalls: number };
type WorkspaceShare = { dailyCalls: number; monthlyCalls: number };

function parseJsonObject(value: string | undefined): Record<string, unknown> {
  if (!value || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function boundedField(source: unknown, key: string, fallback: number, max: number) {
  const raw = source && typeof source === "object" ? (source as Record<string, unknown>)[key] : undefined;
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 && raw <= max) return raw;
  if (typeof raw === "string") return boundedInteger(raw, fallback, 0, max);
  return fallback;
}

/**
 * The global ceiling split into pools. `FOREMENTION_EVIDENCE_POOLS` (one JSON
 * env var, e.g. {"public":{"dailyCalls":15,"monthlyBraveCalls":120}}) may
 * resize the reserves; invalid fields fall back to the defaults. The public and
 * canary reserves together never exceed half of the global ceiling, and the
 * customer pool is always the remainder, so the pools can never sum above it.
 */
export function evidencePoolLimits(env: LimitEnv = process.env) {
  const global = evidenceCapacityLimits(env);
  const configured = parseJsonObject(env.FOREMENTION_EVIDENCE_POOLS);
  const share = (name: "public" | "canary"): PoolShare => ({
    dailyCalls: boundedField(configured[name], "dailyCalls", EVIDENCE_POOL_DEFAULTS[name].dailyCalls, 100_000),
    monthlyBraveCalls: boundedField(configured[name], "monthlyBraveCalls", EVIDENCE_POOL_DEFAULTS[name].monthlyBraveCalls, 1_000_000),
  });
  const wantedPublic = share("public");
  const wantedCanary = share("canary");
  const halfDaily = Math.floor(global.dailyCalls / 2);
  const halfMonthly = Math.floor(global.monthlyBraveCalls / 2);
  const publicPool = { dailyCalls: Math.min(wantedPublic.dailyCalls, halfDaily), monthlyBraveCalls: Math.min(wantedPublic.monthlyBraveCalls, halfMonthly) };
  const canary = {
    dailyCalls: Math.min(wantedCanary.dailyCalls, halfDaily - publicPool.dailyCalls),
    monthlyBraveCalls: Math.min(wantedCanary.monthlyBraveCalls, halfMonthly - publicPool.monthlyBraveCalls),
  };
  const customer = {
    dailyCalls: global.dailyCalls - publicPool.dailyCalls - canary.dailyCalls,
    monthlyBraveCalls: global.monthlyBraveCalls - publicPool.monthlyBraveCalls - canary.monthlyBraveCalls,
  };
  const freeWorkspaces: WorkspaceShare = {
    dailyCalls: Math.min(customer.dailyCalls, boundedField(configured.freeWorkspaces, "dailyCalls", EVIDENCE_POOL_DEFAULTS.freeWorkspaces.dailyCalls, 100_000)),
    monthlyCalls: boundedField(configured.freeWorkspaces, "monthlyCalls", EVIDENCE_POOL_DEFAULTS.freeWorkspaces.monthlyCalls, 1_000_000),
  };
  return { global, customer, public: publicPool, canary, freeWorkspaces };
}

/** Per-workspace allowance for a plan tier. `FOREMENTION_WORKSPACE_EVIDENCE_CAPS` JSON may override per tier. */
export function workspaceEvidenceLimits(tier: EvidencePlanTier, env: LimitEnv = process.env): WorkspaceShare {
  const fallback = WORKSPACE_EVIDENCE_CAPACITY_DEFAULTS[tier] || WORKSPACE_EVIDENCE_CAPACITY_DEFAULTS.free;
  const configured = parseJsonObject(env.FOREMENTION_WORKSPACE_EVIDENCE_CAPS)[tier];
  return {
    dailyCalls: boundedField(configured, "dailyCalls", fallback.dailyCalls, 100_000),
    monthlyCalls: boundedField(configured, "monthlyCalls", fallback.monthlyCalls, 1_000_000),
  };
}

const PAID_BILLING_SOURCES = new Set(["paddle", "stripe", "creem"]);

/**
 * Plan tier for capacity, from an `organization_entitlements` row. Fails closed
 * to `free`: an inactive, expired, unknown or missing row never gets paid capacity.
 */
export function evidencePlanTier(row: { status?: string | null; package_key?: string | null; billing_source?: string | null; expires_at?: string | null } | null | undefined, now = new Date()): EvidencePlanTier {
  if (!row || row.status !== "active") return "free";
  if (row.expires_at) {
    const expiry = new Date(row.expires_at);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) return "free";
  }
  if (row.billing_source === "trial") return row.package_key === "core" ? "trial" : "free";
  if (row.billing_source && PAID_BILLING_SOURCES.has(row.billing_source)) {
    if (row.package_key === "signal") return "signal";
    if (row.package_key === "core") return "core";
    return "free";
  }
  if (row.billing_source === "manual" || row.billing_source === "founder_grant" || row.billing_source === "manual_grant") return "manual";
  return "free";
}

/** Workspaces whose runs are the production canary (`FOREMENTION_CANARY_ORGANIZATION_IDS`, comma-separated UUIDs). */
export function isCanaryOrganization(organizationId: string, env: LimitEnv = process.env) {
  const ids = String(env.FOREMENTION_CANARY_ORGANIZATION_IDS || "").split(",").map((value) => value.trim().toLowerCase()).filter((value) => /^[0-9a-f-]{36}$/.test(value));
  return ids.includes(organizationId.trim().toLowerCase());
}

/** The capacity context for a customer workspace's collection run. */
export function customerEvidenceContext(input: { organizationId: string; entitlement: Parameters<typeof evidencePlanTier>[0]; runId?: string | null; now?: Date; env?: LimitEnv }): EvidenceCapacityContext {
  if (isCanaryOrganization(input.organizationId, input.env)) return { pool: "canary", organizationId: input.organizationId, runId: input.runId ?? null };
  return { pool: "customer", organizationId: input.organizationId, tier: evidencePlanTier(input.entitlement, input.now), runId: input.runId ?? null };
}

const ORGANIZATION_ID = /^[0-9a-f-]{36}$/i;

type AdmissionKey = { key: string; cap: number; scope: EvidenceCapacityScope; message: string };

/** Every counter one call must pass, in the order they are taken. */
export function evidenceAdmissionKeys(context: EvidenceCapacityContext, brave: boolean, now = new Date(), env: LimitEnv = process.env): AdmissionKey[] {
  const iso = now.toISOString();
  const day = iso.slice(0, 10);
  const month = iso.slice(0, 7);
  const pools = evidencePoolLimits(env);
  const keys: AdmissionKey[] = [];
  if (context.pool === "customer") {
    if (!ORGANIZATION_ID.test(context.organizationId)) throw new EvidenceCapacityExhaustedError("unavailable", EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE);
    const org = context.organizationId.toLowerCase();
    const workspace = workspaceEvidenceLimits(context.tier, env);
    keys.push({ key: `org:${org}:month:${month}`, cap: workspace.monthlyCalls, scope: "workspace_monthly", message: EVIDENCE_CAPACITY_WORKSPACE_MONTHLY_MESSAGE });
    keys.push({ key: `org:${org}:day:${day}`, cap: workspace.dailyCalls, scope: "workspace_daily", message: EVIDENCE_CAPACITY_WORKSPACE_DAILY_MESSAGE });
    if (context.tier === "free") {
      keys.push({ key: `pool:free-workspaces:month:${month}`, cap: pools.freeWorkspaces.monthlyCalls, scope: "monthly", message: EVIDENCE_CAPACITY_FREE_SHARE_MESSAGE });
      keys.push({ key: `pool:free-workspaces:day:${day}`, cap: pools.freeWorkspaces.dailyCalls, scope: "daily", message: EVIDENCE_CAPACITY_FREE_SHARE_MESSAGE });
    }
    // The customer pool keeps the original global key names, so usage already
    // recorded this day/month still counts after deploy (never resets upward).
    if (brave) keys.push({ key: `brave-month:${month}`, cap: pools.customer.monthlyBraveCalls, scope: "monthly", message: EVIDENCE_CAPACITY_MONTHLY_MESSAGE });
    keys.push({ key: `day:${day}`, cap: pools.customer.dailyCalls, scope: "daily", message: EVIDENCE_CAPACITY_DAILY_MESSAGE });
    return keys;
  }
  const pool = context.pool === "canary" ? pools.canary : pools.public;
  if (brave) keys.push({ key: `pool:${context.pool}:brave-month:${month}`, cap: pool.monthlyBraveCalls, scope: "monthly", message: EVIDENCE_CAPACITY_MONTHLY_MESSAGE });
  keys.push({ key: `pool:${context.pool}:day:${day}`, cap: pool.dailyCalls, scope: "daily", message: context.pool === "public" ? EVIDENCE_CAPACITY_PUBLIC_DAILY_MESSAGE : EVIDENCE_CAPACITY_DAILY_MESSAGE });
  return keys;
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
export const EVIDENCE_CAPACITY_WORKSPACE_DAILY_MESSAGE = "This workspace has used today's live-evidence allowance for its plan. No new provider calls were made and nothing was charged; it resets after 00:00 UTC.";
export const EVIDENCE_CAPACITY_WORKSPACE_MONTHLY_MESSAGE = "This workspace has used this month's live-evidence allowance for its plan. No new provider calls were made and nothing was charged; it resets on the 1st (UTC) or with a plan change.";
export const EVIDENCE_CAPACITY_FREE_SHARE_MESSAGE = "The shared capacity for free workspaces is used up for now. No provider call was made; it resets after 00:00 UTC, or upgrade for dedicated capacity.";
export const EVIDENCE_CAPACITY_PUBLIC_DAILY_MESSAGE = "The free public tools have used today's capacity. No provider call was made and no result was invented; try again after 00:00 UTC.";
export const EVIDENCE_CAPACITY_DEMO_MESSAGE = "The fictional demo never calls a live provider. Exit the demo and sign in to collect live evidence.";

/**
 * Admit one grounded evidence call or throw EvidenceCapacityExhaustedError.
 * Without a registered store (unit tests, local scripts) admission is a no-op,
 * except for the demo, which is refused everywhere. A caller that does not pass
 * a context is admitted from the PUBLIC pool, never from customer capacity.
 */
export async function admitEvidenceCall(input: { brave: boolean; now?: Date; env?: LimitEnv; context?: EvidenceCapacityContext }) {
  const context = input.context || PUBLIC_EVIDENCE_CONTEXT;
  if (context.pool === "demo") throw new EvidenceCapacityExhaustedError("demo", EVIDENCE_CAPACITY_DEMO_MESSAGE);
  const state = registered();
  if (!state) return { admitted: true as const, enforced: false as const, pool: context.pool };
  if (!state.store) {
    if (state.required) throw new EvidenceCapacityExhaustedError("unavailable", EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE);
    return { admitted: true as const, enforced: false as const, pool: context.pool };
  }
  const keys = evidenceAdmissionKeys(context, input.brave, input.now, input.env);
  const store = state.store;
  const taken: string[] = [];
  try {
    await ensureTable(state);
    for (const entry of keys) {
      if (!await admitOne(store, entry.key, entry.cap)) {
        throw new EvidenceCapacityExhaustedError(entry.scope, entry.message);
      }
      taken.push(entry.key);
    }
  } catch (error) {
    // Give back every unit this refused call already took, newest first.
    for (const key of taken.reverse()) await store.prepare(RELEASE_SQL).bind(key).run().catch(() => undefined);
    if (error instanceof EvidenceCapacityExhaustedError) throw error;
    throw new EvidenceCapacityExhaustedError("unavailable", EVIDENCE_CAPACITY_UNAVAILABLE_MESSAGE);
  }
  return { admitted: true as const, enforced: true as const, pool: context.pool };
}

type PoolUsage = { dailyCap: number; dailyUsed: number | null; dailyRemaining: number | null; monthlyBraveCap: number; monthlyBraveUsed: number | null; monthlyBraveRemaining: number | null };

export type EvidenceCapacitySnapshot = {
  enforced: boolean;
  braveConfigured: boolean;
  day: string;
  /** Top-level daily/monthly fields describe the CUSTOMER pool (FM-01). */
  dailyCap: number;
  dailyUsed: number | null;
  dailyRemaining: number | null;
  month: string;
  monthlyBraveCap: number;
  monthlyBraveUsed: number | null;
  monthlyBraveRemaining: number | null;
  /** The one global ceiling all pools are carved from. */
  globalDailyCap: number;
  globalMonthlyBraveCap: number;
  pools: { public: PoolUsage; canary: PoolUsage };
  /** Present when a workspace context was given. */
  workspace?: { tier: EvidencePlanTier | "canary"; dailyCap: number; dailyUsed: number | null; dailyRemaining: number | null; monthlyCap: number; monthlyUsed: number | null; monthlyRemaining: number | null };
};

function emptyPool(pool: { dailyCalls: number; monthlyBraveCalls: number }): PoolUsage {
  return { dailyCap: pool.dailyCalls, dailyUsed: null, dailyRemaining: null, monthlyBraveCap: pool.monthlyBraveCalls, monthlyBraveUsed: null, monthlyBraveRemaining: null };
}

/** Operator / preflight readout. Never throws; unknown usage is reported as null, not zero. */
export async function readEvidenceCapacity(input: { brave: boolean; now?: Date; env?: LimitEnv; context?: EvidenceCapacityContext }): Promise<EvidenceCapacitySnapshot> {
  const pools = evidencePoolLimits(input.env);
  const keys = evidencePeriodKeys(input.now);
  const day = keys.day.slice(4);
  const month = keys.braveMonth.slice(12);
  const snapshot: EvidenceCapacitySnapshot = {
    enforced: false,
    braveConfigured: input.brave,
    day,
    dailyCap: pools.customer.dailyCalls,
    dailyUsed: null,
    dailyRemaining: null,
    month,
    monthlyBraveCap: pools.customer.monthlyBraveCalls,
    monthlyBraveUsed: null,
    monthlyBraveRemaining: null,
    globalDailyCap: pools.global.dailyCalls,
    globalMonthlyBraveCap: pools.global.monthlyBraveCalls,
    pools: { public: emptyPool(pools.public), canary: emptyPool(pools.canary) },
  };
  const context = input.context;
  const workspaceLimits = context?.pool === "customer" && ORGANIZATION_ID.test(context.organizationId)
    ? { tier: context.tier as EvidencePlanTier | "canary", ...workspaceEvidenceLimits(context.tier, input.env), org: context.organizationId.toLowerCase() }
    : null;
  if (workspaceLimits) {
    snapshot.workspace = { tier: workspaceLimits.tier, dailyCap: workspaceLimits.dailyCalls, dailyUsed: null, dailyRemaining: null, monthlyCap: workspaceLimits.monthlyCalls, monthlyUsed: null, monthlyRemaining: null };
  }
  const state = registered();
  if (!state?.store) return snapshot;
  try {
    await ensureTable(state);
    const read = async (key: string) => {
      const row = await state.store!.prepare("SELECT used FROM evidence_capacity_counters WHERE period_key = ?").bind(key).first<{ used: number }>();
      return row && typeof row.used === "number" ? row.used : 0;
    };
    const [daily, monthly, publicDaily, publicMonthly, canaryDaily, canaryMonthly] = await Promise.all([
      read(keys.day), read(keys.braveMonth),
      read(`pool:public:day:${day}`), read(`pool:public:brave-month:${month}`),
      read(`pool:canary:day:${day}`), read(`pool:canary:brave-month:${month}`),
    ]);
    const fill = (target: PoolUsage, usedDaily: number, usedMonthly: number) => {
      target.dailyUsed = usedDaily;
      target.dailyRemaining = Math.max(0, target.dailyCap - usedDaily);
      target.monthlyBraveUsed = usedMonthly;
      target.monthlyBraveRemaining = Math.max(0, target.monthlyBraveCap - usedMonthly);
    };
    fill(snapshot.pools.public, publicDaily, publicMonthly);
    fill(snapshot.pools.canary, canaryDaily, canaryMonthly);
    if (workspaceLimits && snapshot.workspace) {
      const [orgDaily, orgMonthly] = await Promise.all([read(`org:${workspaceLimits.org}:day:${day}`), read(`org:${workspaceLimits.org}:month:${month}`)]);
      snapshot.workspace.dailyUsed = orgDaily;
      snapshot.workspace.dailyRemaining = Math.max(0, workspaceLimits.dailyCalls - orgDaily);
      snapshot.workspace.monthlyUsed = orgMonthly;
      snapshot.workspace.monthlyRemaining = Math.max(0, workspaceLimits.monthlyCalls - orgMonthly);
    }
    snapshot.enforced = true;
    snapshot.dailyUsed = daily;
    snapshot.dailyRemaining = Math.max(0, pools.customer.dailyCalls - daily);
    snapshot.monthlyBraveUsed = monthly;
    snapshot.monthlyBraveRemaining = Math.max(0, pools.customer.monthlyBraveCalls - monthly);
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
