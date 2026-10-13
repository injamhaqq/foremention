"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { billingReturnNotice } from "@/lib/billing-return-notice";

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
  checkoutPending?: { state: string; createdAt: string } | null;
  buyerQuestionLimit?: number | null;
};

type ReconcileResult = { action: string; reason: string };

const RECONCILE_COPY: Record<string, string> = {
  none: "No unresolved checkout remains for this workspace.",
  keep: "The checkout link is still open. Complete it in the Paddle window, or check again later.",
  await_provider: "Paddle has the payment and is finalising it. Access changes only after Paddle's signed confirmation reaches Foremention.",
  settle_paid: "Paddle reports this checkout as paid. Access is applied only by Paddle's signed confirmation; refresh shortly.",
  release: "The unpaid checkout was closed. You can start a new checkout.",
  cancel_then_release: "The abandoned checkout was cancelled at Paddle so it can no longer be charged. You can start a new checkout.",
  manual_review: "This checkout needs a manual billing review. No new charge will be started; contact support.",
};



const LABELS: Record<"core" | "signal", string> = { core: "Core", signal: "Signal" };

function offerLabel(offer: CheckoutOffer) {
  return `${LABELS[offer.packageKey]} · ${offer.billingInterval === "annual" ? "annual" : "monthly"}`;
}

export function BillingControl() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [returnNotice, setReturnNotice] = useState<string | null>(null);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  async function reconcileCheckout() {
    setReconciling(true);
    try {
      const response = await fetch("/api/billing/checkout/reconcile", { method: "POST", cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: ReconcileResult };
      setReconcileMessage(payload.data ? RECONCILE_COPY[payload.data.action] || RECONCILE_COPY.manual_review : "Checkout status could not be checked right now. No paid access was inferred.");
    } catch {
      setReconcileMessage("Checkout status could not be checked right now. No paid access was inferred.");
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    let live = true;
    void fetch("/api/billing/status", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("status unavailable")))
      .then((payload: { data?: BillingStatus }) => {
        if (!live || !payload.data) return;
        setStatus(payload.data);
        setReturnNotice(billingReturnNotice(window.location.search, payload.data));
      })
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
    {returnNotice ? <p role="status">{returnNotice}</p> : null}
    {typeof status.buyerQuestionLimit === "number" ? <p className="table-caption">Buyer-question capacity enforced for this workspace: {status.buyerQuestionLimit}.</p> : null}
    {status.owner && status.checkoutPending ? <div role="status">
      <p>A checkout was opened and is not yet confirmed by Paddle. It does not grant access; another checkout cannot start until it is resolved.</p>
      <button className="button button--outline" type="button" disabled={reconciling} onClick={() => void reconcileCheckout()}>{reconciling ? "Checking…" : "Check checkout status"}</button>
      {reconcileMessage ? <p>{reconcileMessage}</p> : null}
    </div> : null}
    {!status.configured ? <>
      <p>Self-serve paid checkout is not configured for this environment. Current access remains founder-led; no card or paid package is implied.</p>
      <Link className="button button--outline" href="/contact">Discuss commercial access</Link>
    </> : !status.owner ? <p>Only the workspace owner can start or manage a subscription.</p> : status.canManage ? <>
      <p>The billing portal is the self-service surface for payment methods, invoices, and any upgrade, downgrade, or cancellation options enabled by the configured billing provider.</p>
      <form action="/api/billing/portal" method="post"><button className="button button--outline" type="submit">Manage billing</button></form>
    </> : <>
      <p>Hosted subscription checkout is available only for package and billing intervals explicitly configured with the active billing provider. Intelligence remains custom-scoped.</p>
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
