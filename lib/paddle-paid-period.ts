/**
 * Paddle paid-period reconciliation. A transaction.completed webhook can have
 * billing_period=null for an initial checkout (Paddle populates it mainly for
 * subscription renewals). Never convert that absence into unlimited access.
 *
 * This read-only provider lookup runs ONLY after the signed event passes
 * checkout-reservation or exact recurring-subscription admission in the
 * billing webhook route. Failed or mismatched lookups remain retryable 503s.
 *
 * https://developer.paddle.com/webhooks/transactions/transaction-completed/
 * https://developer.paddle.com/api-reference/subscriptions/get-subscription/
 */
import { paddleCandidateConfigured, paddlePackageForPriceId, type PaddleInterval, type PaddlePackage } from "./paddle-billing.ts";

type Data = Record<string, unknown>;
const SUBSCRIPTION_ID = /^sub_[a-z0-9]{26}$/;
const CUSTOMER_ID = /^ctm_[a-z0-9]{26}$/;
const API_HOST = { sandbox: "https://sandbox-api.paddle.com", live: "https://api.paddle.com" } as const;

function record(value: unknown): Data | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Data : null;
}

function validTime(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export type PaddlePaidPeriodIdentity = {
  subscriptionId: string;
  customerId: string;
  packageKey: PaddlePackage;
  billingInterval: PaddleInterval;
  occurredAt: string;
};

export function validatePaddlePaidPeriod(
  subscription: unknown,
  input: PaddlePaidPeriodIdentity,
  now = new Date(),
): string | null {
  const data = record(subscription);
  if (!data || data.id !== input.subscriptionId || data.customer_id !== input.customerId
    || data.status !== "active" || !Array.isArray(data.items) || data.items.length !== 1) return null;
  const item = record(data.items[0]);
  const price = record(item?.price);
  const offer = typeof price?.id === "string" ? paddlePackageForPriceId(price.id) : null;
  if (!item || item.quantity !== 1 || !offer
    || offer.packageKey !== input.packageKey || offer.billingInterval !== input.billingInterval) return null;

  const period = record(data.current_billing_period);
  const started = validTime(period?.starts_at);
  const ends = validTime(period?.ends_at);
  const occurred = validTime(input.occurredAt);
  if (!started || !ends || !occurred || !Number.isFinite(now.getTime())
    || !(started < ends)
    || started > occurred
    || started > now
    || ends <= now
    || ends <= occurred) return null;
  return ends.toISOString();
}

/** Returns bounded verified expiry or throws; callers must never grant on error. */
export async function reconcilePaddlePaidPeriod(
  input: PaddlePaidPeriodIdentity,
  now = new Date(),
  httpGet: typeof fetch = fetch,
): Promise<string> {
  const mode = process.env.PADDLE_ENVIRONMENT?.trim();
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!paddleCandidateConfigured() || (mode !== "sandbox" && mode !== "live")
    || !key || !SUBSCRIPTION_ID.test(input.subscriptionId)
    || !CUSTOMER_ID.test(input.customerId)) {
    throw new Error("Verified Paddle paid-period lookup is unavailable.");
  }
  const response = await httpGet(
    API_HOST[mode] + "/subscriptions/" + encodeURIComponent(input.subscriptionId),
    {
      method: "GET",
      headers: { Authorization: "Bearer " + key, Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    },
  );
  if (!response.ok) throw new Error("Paddle paid period could not be reconciled.");
  const envelope = record(await response.json().catch(() => null));
  const periodEnd = validatePaddlePaidPeriod(envelope?.data, input, now);
  if (!periodEnd) throw new Error("Paddle paid period is missing or mismatched.");
  return periodEnd;
}
