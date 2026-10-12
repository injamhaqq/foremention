import type { EvidenceCapacitySnapshot } from "@/lib/evidence-capacity";

function amount(value: number | null) {
  return value === null ? "Unavailable" : value.toLocaleString("en-US");
}

/** Only render from the server under the explicit company-operator gate (A18). */
export function EvidenceCapacityCard({ snapshot }: { snapshot: EvidenceCapacitySnapshot | null }) {
  return <section className="panel" aria-labelledby="evidence-capacity-title">
    <span className="eyebrow">Company operator · free-allocation guard</span>
    <h2 id="evidence-capacity-title">Live-evidence capacity</h2>
    {!snapshot || !snapshot.enforced ? <p>Capacity usage is unavailable. Live evidence calls fail closed until the capacity store can be read; remaining capacity has not been assumed.</p> : <>
      <dl className="agent-plane__grid">
        <div><dt>Grounded calls today ({snapshot.day} UTC)</dt><dd>{amount(snapshot.dailyUsed)} / {amount(snapshot.dailyCap)}</dd></div>
        <div><dt>Remaining today</dt><dd>{amount(snapshot.dailyRemaining)}</dd></div>
        {snapshot.braveConfigured && <div><dt>Brave Search calls this month ({snapshot.month})</dt><dd>{amount(snapshot.monthlyBraveUsed)} / {amount(snapshot.monthlyBraveCap)}</dd></div>}
        {snapshot.braveConfigured && <div><dt>Brave calls remaining this month</dt><dd>{amount(snapshot.monthlyBraveRemaining)}</dd></div>}
      </dl>
      <p>New evidence calls stop when either allowance reaches zero, before Workers AI’s daily free neurons or Brave’s monthly free credit would be exceeded. Adjust with FOREMENTION_DAILY_EVIDENCE_CALL_CAP and FOREMENTION_MONTHLY_BRAVE_CALL_CAP.</p>
    </>}
  </section>;
}
