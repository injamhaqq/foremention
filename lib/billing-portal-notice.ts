// Fix track "ux" (2026-10-19): the Settings "Open billing portal" control is a
// plain HTML form POST to /api/billing/portal (the existing Paddle customer
// portal path). On failure the route used to answer with raw JSON, which a
// browser form submission renders as a bare JSON page. Form navigations now go
// back to Settings with a short, known notice code; fetch/JSON clients keep the
// JSON contract. Only codes from this fixed list are ever rendered.

export const BILLING_PORTAL_NOTICES = {
  unavailable: "Self-serve billing is not available for this workspace yet. Email support and we will help with invoices or plan changes.",
  owner_only: "Only the workspace owner can open the billing portal.",
  demo: "The fictional demo workspace has no billing portal.",
  no_customer: "There is no billing account on file for this workspace yet. Choose a plan first, or email support if you already pay.",
  verify_failed: "Billing ownership could not be verified right now. Nothing was changed. Please try again in a few minutes.",
  provider_error: "The billing provider could not open the portal right now. Nothing was changed. Please try again in a few minutes.",
  workspace_missing: "Complete workspace setup before managing billing.",
} as const;

export type BillingPortalNoticeCode = keyof typeof BILLING_PORTAL_NOTICES;

export function billingPortalNotice(code: string | null | undefined): string | null {
  if (!code || !Object.prototype.hasOwnProperty.call(BILLING_PORTAL_NOTICES, code)) return null;
  return BILLING_PORTAL_NOTICES[code as BillingPortalNoticeCode];
}

/** True for browser form navigations (HTML), false for fetch/JSON clients. */
export function prefersHtmlNavigation(request: Request): boolean {
  const accept = (request.headers.get("accept") || "").toLowerCase();
  if (accept.includes("application/json")) return false;
  if (accept.includes("text/html")) return true;
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  return contentType.startsWith("application/x-www-form-urlencoded") || contentType.startsWith("multipart/form-data");
}

/** Same-origin relative Settings location carrying a fixed notice code. */
export function billingPortalNoticePath(code: BillingPortalNoticeCode): string {
  return `/app/settings?billing_portal=${code}#plan`;
}
