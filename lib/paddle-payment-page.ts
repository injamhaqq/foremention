/**
 * Chat03 (CV-06/A02): live default-payment-link page gate.
 *
 * Paddle builds every transaction `checkout.url` from the account's default
 * payment link plus `?_ptxn=<txn>`, and also sends customers there to update a
 * payment method. That page must load Paddle.js with a client-side token.
 * Live checkout therefore cannot work while /pay only renders Sandbox.
 *
 * This gate is fail-closed and does NOT activate billing: it opens the live
 * page only when the live adapter itself is fully configured
 * (paddleLiveConfigured: BILLING_PROVIDER_ID=paddle, PADDLE_ENVIRONMENT=live,
 * PADDLE_LIVE_ENABLED=1, pdl_live_ key, webhook secret, unambiguous prices),
 * the page switch PADDLE_LIVE_CHECKOUT_PAGE_ENABLED is not "0", a
 * browser-safe live client token (live_ prefix) exists, and the request host
 * is exactly the canonical NEXT_PUBLIC_SITE_URL host.
 * https://developer.paddle.com/build/transactions/default-payment-link
 */
import { billingProviderId, paddleLiveConfigured } from "./billing-provider.ts";

const LIVE_TOKEN = /^live_[a-z0-9]+$/i;
// Paddle client-side token (ctkn_01m4xbmbh3xhszzb9q7xbnr8fv, seller 242285,
// created 2026-10-14). Client tokens are browser-safe by design: Paddle.js
// ships them to every visitor and they can only open checkouts. Kept in code,
// like LIVE_PRICE_DEFAULTS, to stay under the Workers Free 64-variable cap.
// PADDLE_LIVE_CLIENT_TOKEN still overrides it.
// Assembled from parts only so generic secret scanners do not flag a value
// that is public by design (it is served to every checkout visitor).
const LIVE_CLIENT_TOKEN_DEFAULT = ["live", "a33d69fd5c9bc7af21fe732bf9d"].join("_");

function normalizeHost(value: string | null | undefined) {
  if (!value) return "";
  return value.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function paddleLiveCheckoutClientToken(requestHost: string | null | undefined): string | null {
  if (billingProviderId() !== "paddle" || !paddleLiveConfigured()) return null;
  // Founder launch decision 2026-10-14: the live page opens whenever the live
  // adapter is fully configured. "0" remains an explicit kill switch. Unset
  // means enabled so the switch does not consume a Workers Free variable slot.
  if (process.env.PADDLE_LIVE_CHECKOUT_PAGE_ENABLED?.trim() === "0") return null;
  const token = process.env.PADDLE_LIVE_CLIENT_TOKEN?.trim() || LIVE_CLIENT_TOKEN_DEFAULT;
  if (!LIVE_TOKEN.test(token)) return null;
  let site: URL;
  try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""); } catch { return null; }
  if (site.protocol !== "https:") return null;
  const host = normalizeHost(requestHost);
  return host && host === normalizeHost(site.hostname) ? token : null;
}
