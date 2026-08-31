"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CheckoutOffer = { packageKey: "core" | "signal"; billingInterval: "monthly" | "annual" };
type BillingStatus = {
  configured: boolean;
  owner: boolean;
  state: string;
  packageKey: string;
  entitlementStatus: string;
  entitlementExpiresAt: string | null;
  gracePeriodEndsAt: string | null;
  canManage: boolean;
  checkoutPackages: Array<"core" | "signal">;
  checkoutOffers: CheckoutOffer[];
};

const LABELS: Record<"core" | "signal", string> = { core: "Core", signal: "Signal" };

function offerLabel(offer: CheckoutOffer) {
  return `${LABELS[offer.packageKey]} · ${offer.billingInterval === "annual" ? "annual" : "monthly"}`;
}

export function BillingControl() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void fetch("/api/billing/status", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("status unavailable")))
      .then((payload: { data?: BillingStatus }) => { if (live && payload.data) setStatus(payload.data); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  if (failed) return <section className="panel"><span className="eyebrow">Billing</span><h2>Founder-led billing</h2><p>Billing status could not be loaded. No paid entitlement has been inferred.</p><Link className="button button--outline" href="/contact">Contact Foremention</Link></section>;
  if (!status) return <section className="panel"><span className="eyebrow">Billing</span><h2>Checking commercial access.</h2><p className="table-caption">Foremention derives paid access from verified server-side entitlement state.</p></section>;

  const graceCopy = status.state === "past_due"
    ? status.gracePeriodEndsAt
      ? `Payment needs attention. Any configured grace access ends at ${new Date(status.gracePeriodEndsAt).toLocaleString()}; verified billing events remain authoritative.`
      : "Payment needs attention. No grace period is configured, so paid entitlement is paused until a verified recovery event arrives."
    : null;

  return <section className="panel">
    <span className="eyebrow">Billing</span>
    <h2>{status.packageKey === "private_beta" ? "Design-partner access" : `${status.packageKey} · ${status.state}`}</h2>
    {graceCopy ? <p>{graceCopy}</p> : null}
    {!status.configured ? <>
      <p>Self-serve paid checkout is not configured for this environment. Current access remains founder-led; no card or paid package is implied.</p>
      <Link className="button button--outline" href="/contact">Discuss commercial access</Link>
    </> : !status.owner ? <p>Only the workspace owner can start or manage a subscription.</p> : status.canManage ? <>
      <p>Stripe Customer Portal is the self-service surface for payment methods, invoices, and any upgrade, downgrade, or cancellation options enabled in the provider configuration.</p>
      <form action="/api/billing/portal" method="post"><button className="button button--outline" type="submit">Manage billing</button></form>
    </> : <>
      <p>Hosted subscription checkout is available only for the package and billing intervals backed by configured Stripe Prices. Intelligence remains custom-scoped.</p>
      <div className="settings-actions">
        {status.checkoutOffers.map((offer) => <form action="/api/billing/checkout" method="post" key={`${offer.packageKey}:${offer.billingInterval}`}>
          <input type="hidden" name="packageKey" value={offer.packageKey} />
          <input type="hidden" name="billingInterval" value={offer.billingInterval} />
          <button className="button button--outline" type="submit">Choose {offerLabel(offer)}</button>
        </form>)}
        <Link className="button button--outline" href="/contact?plan=intelligence">Discuss Intelligence</Link>
      </div>
    </>}
  </section>;
}
