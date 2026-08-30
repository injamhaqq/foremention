"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BillingStatus = {
  configured: boolean;
  owner: boolean;
  state: string;
  packageKey: string;
  canManage: boolean;
  checkoutPackages: Array<"core" | "signal">;
};

const LABELS: Record<"core" | "signal", string> = { core: "Core", signal: "Signal" };

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

  return <section className="panel">
    <span className="eyebrow">Billing</span>
    <h2>{status.packageKey === "private_beta" ? "Design-partner access" : `${status.packageKey} · ${status.state}`}</h2>
    {!status.configured ? <>
      <p>Self-serve paid checkout is not configured for this environment. Current access remains founder-led; no card or paid package is implied.</p>
      <Link className="button button--outline" href="/contact">Discuss commercial access</Link>
    </> : !status.owner ? <p>Only the workspace owner can start or manage a subscription.</p> : status.canManage ? <form action="/api/billing/portal" method="post"><button className="button button--outline" type="submit">Manage billing</button></form> : <>
      <p>Hosted subscription checkout is available for the configured packages below. Intelligence remains custom-scoped.</p>
      <div className="settings-actions">
        {status.checkoutPackages.map((packageKey) => <form action="/api/billing/checkout" method="post" key={packageKey}><input type="hidden" name="packageKey" value={packageKey} /><button className="button button--outline" type="submit">Choose {LABELS[packageKey]}</button></form>)}
        <Link className="button button--outline" href="/contact?plan=intelligence">Discuss Intelligence</Link>
      </div>
    </>}
  </section>;
}
