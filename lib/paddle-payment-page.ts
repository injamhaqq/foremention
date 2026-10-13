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
 * a separate page switch PADDLE_LIVE_CHECKOUT_PAGE_ENABLED=1 is set, a
 * browser-safe live client token (live_ prefix) exists, and the request host
 * is exactly the canonical NEXT_PUBLIC_SITE_URL host.
 * https://developer.paddle.com/build/transactions/default-payment-link
 */
import { billingProviderId, paddleLiveConfigured } from "./billing-provider.ts";

const LIVE_TOKEN = /^live_[a-z0-9]+$/i;

function normalizeHost(value: string | null | undefined) {
  if (!value) return "";
  return value.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function paddleLiveCheckoutClientToken(requestHost: string | null | undefined): string | null {
  if (billingProviderId() !== "paddle" || !paddleLiveConfigured()) return null;
  if (process.env.PADDLE_LIVE_CHECKOUT_PAGE_ENABLED?.trim() !== "1") return null;
  const token = process.env.PADDLE_LIVE_CLIENT_TOKEN?.trim() || "";
  if (!LIVE_TOKEN.test(token)) return null;
  let site: URL;
  try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""); } catch { return null; }
  if (site.protocol !== "https:") return null;
  const host = normalizeHost(requestHost);
  return host && host === normalizeHost(site.hostname) ? token : null;
}
