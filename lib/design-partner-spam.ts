/**
 * Spam protection for the public pilot (design-partner) form.
 *
 * Layers, cheapest first:
 *  1. Honeypot: a hidden `website` field humans never fill.
 *  2. Time trap: the page stamps `formStartedAt`; a submission sent less than
 *     MIN_FILL_MS after render is treated as automated.
 *  3. Per-network rate limit in the Worker (worker/index.ts publicRouteLimit,
 *     endpoint "design-partner"), persisted in D1, before the request reaches
 *     the route.
 *  4. Per-content daily cap in Postgres (claim_design_partner_submission).
 *
 * A trapped submission gets the same "received" response as a real one so a
 * bot cannot learn which filter caught it. Nothing is stored or emailed.
 */
export const HONEYPOT_FIELD = "website";
export const STARTED_AT_FIELD = "formStartedAt";
export const MIN_FILL_MS = 3_000;
/** Older than this, the stamp is ignored rather than trusted (cached page, long tab). */
const MAX_STAMP_AGE_MS = 24 * 60 * 60 * 1000;

/** Per-network limit enforced in the Worker for POST /api/design-partner. */
export const DESIGN_PARTNER_RATE_LIMIT = { endpoint: "design-partner", limit: 5, windowMs: 60 * 60 * 1000 } as const;

/** Stamp rendered into the form; a function so page components stay pure. */
export function formStartedAtStamp(now = Date.now()) {
  return String(now);
}

export type SpamVerdict = { trapped: false } | { trapped: true; reason: "honeypot" | "too_fast" };

export function designPartnerSpamVerdict(input: Record<string, unknown>, now = Date.now()): SpamVerdict {
  const honeypot = input[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim()) return { trapped: true, reason: "honeypot" };
  const stamp = input[STARTED_AT_FIELD];
  if (typeof stamp === "string" && /^\d{10,16}$/.test(stamp.trim())) {
    const startedAt = Number(stamp.trim());
    const elapsed = now - startedAt;
    // A stamp in the future or within the minimum fill time is automated.
    if (elapsed < MIN_FILL_MS && elapsed > -MAX_STAMP_AGE_MS) return { trapped: true, reason: "too_fast" };
  }
  // A missing or malformed stamp is allowed: JSON clients and cached pages may
  // not send one, and the rate limits still apply.
  return { trapped: false };
}

/**
 * Why an operator alert for a saved application was or was not sent. The
 * route logs this (no personal data) so a silent misconfiguration shows up in
 * Worker logs instead of losing leads quietly.
 */
export type OperatorAlertOutcome = "sent" | "partial" | "failed" | "not_configured" | "no_recipients";

export function operatorAlertOutcome(configured: boolean, recipients: number, results: PromiseSettledResult<unknown>[]): OperatorAlertOutcome {
  if (!configured) return "not_configured";
  if (!recipients) return "no_recipients";
  const failed = results.filter((result) => result.status === "rejected").length;
  if (!failed) return "sent";
  return failed === results.length ? "failed" : "partial";
}
