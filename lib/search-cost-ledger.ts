/**
 * FM-01 (capacity track): per-call search cost record.
 *
 * Every independent web-search request made for grounded evidence produces one
 * cost record: provider, units (search requests), estimated cost, the capacity
 * pool, and the account (workspace) it was spent for. It is always emitted as an
 * allow-listed structured log line (`search_cost_recorded`), the existing
 * operational-logging pattern, so cost is visible from day one with no schema
 * change.
 *
 * A durable copy is written to `public.search_cost_events` ONLY when the
 * operator has applied migration 20261019120000_search_cost_events.sql and set
 * FOREMENTION_SEARCH_COST_LEDGER=1 (same opt-in-after-migration pattern as the
 * verified billing inbox). A failed or missing ledger write never blocks or
 * fails the evidence call; it is logged as `search_cost_ledger_write_failed`.
 *
 * The estimate is the provider's list price per request. Brave's monthly free
 * credit (~1,000 requests) means requests inside the credit are not a cash
 * charge; the estimate still records what the credit consumed, labelled
 * `estimated_list_price`, never as a billed amount.
 */
import { logOperationalEvent } from "./structured-logger.ts";
import type { EvidenceCapacityContext } from "./evidence-capacity.ts";

export type SearchCostProvider = "brave-search" | "bing-rss";

/** List price per search request, USD. Brave Search API: $5 per 1,000 requests. Bing RSS is keyless. */
export const SEARCH_COST_PER_REQUEST_USD: Record<SearchCostProvider, number> = {
  "brave-search": 0.005,
  "bing-rss": 0,
};

export type SearchCostEvent = {
  provider: SearchCostProvider;
  units: number;
  estimatedCostUsd: number;
  costSource: "estimated_list_price";
  capacityPool: EvidenceCapacityContext["pool"];
  organizationId: string | null;
  runId: string | null;
  outcome: "completed" | "failed";
  observedAt: string;
};

const UUID = /^[0-9a-f-]{36}$/i;

export function searchCostEvent(input: {
  provider: SearchCostProvider;
  units?: number;
  context: EvidenceCapacityContext;
  outcome: "completed" | "failed";
  now?: Date;
}): SearchCostEvent {
  const units = Number.isSafeInteger(input.units) && (input.units as number) > 0 ? input.units as number : 1;
  const rate = SEARCH_COST_PER_REQUEST_USD[input.provider] ?? 0;
  const organizationId = "organizationId" in input.context && typeof input.context.organizationId === "string" && UUID.test(input.context.organizationId)
    ? input.context.organizationId.toLowerCase()
    : null;
  const runId = "runId" in input.context && typeof input.context.runId === "string" && UUID.test(input.context.runId)
    ? input.context.runId.toLowerCase()
    : null;
  return {
    provider: input.provider,
    units,
    estimatedCostUsd: Math.round(units * rate * 1_000_000) / 1_000_000,
    costSource: "estimated_list_price",
    capacityPool: input.context.pool,
    organizationId,
    runId,
    outcome: input.outcome,
    observedAt: (input.now || new Date()).toISOString(),
  };
}

export function searchCostLedgerEnabled(env: Record<string, string | undefined> = process.env) {
  return env.FOREMENTION_SEARCH_COST_LEDGER === "1" && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

type LedgerWriter = (row: Record<string, unknown>) => Promise<unknown>;

async function defaultWriter(row: Record<string, unknown>) {
  const { supabaseRest } = await import("./supabase-rest.ts");
  return supabaseRest("search_cost_events", { method: "POST", serviceRole: true, prefer: "return=minimal", body: row });
}

/** Log one search cost record and, when enabled, persist it. Never throws. */
export async function recordSearchCost(event: SearchCostEvent, deps: { env?: Record<string, string | undefined>; write?: LedgerWriter } = {}) {
  logOperationalEvent("search_cost_recorded", {
    provider: event.provider,
    units: event.units,
    estimatedCostUsd: event.estimatedCostUsd,
    pool: event.capacityPool,
    accountId: event.organizationId ?? `pool:${event.capacityPool}`,
    runId: event.runId ?? undefined,
    outcome: event.outcome,
  });
  if (!searchCostLedgerEnabled(deps.env)) return { persisted: false as const };
  try {
    await (deps.write || defaultWriter)({
      organization_id: event.organizationId,
      run_id: event.runId,
      capacity_pool: event.capacityPool,
      provider: event.provider,
      units: event.units,
      estimated_cost_usd: event.estimatedCostUsd,
      cost_source: event.costSource,
      outcome: event.outcome,
      observed_at: event.observedAt,
    });
    return { persisted: true as const };
  } catch {
    logOperationalEvent("search_cost_ledger_write_failed", { provider: event.provider, pool: event.capacityPool });
    return { persisted: false as const };
  }
}
