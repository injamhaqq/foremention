import type { CompanyOperationalCostReadiness } from "@/lib/company-operational-cost-readiness";

function count(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed).toLocaleString("en-US") : "Unavailable";
}

function usd(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(parsed)
    : "Unavailable";
}

/** Only render from the server under the explicit company-operator gate. */
export function CompanyOperationalCostCard({ snapshot }: { snapshot: CompanyOperationalCostReadiness | null }) {
  return <section className="panel" aria-labelledby="company-cost-readiness-title">
    <span className="eyebrow">Company operator · internal economics</span>
    <h2 id="company-cost-readiness-title">Delivery-cost readiness</h2>
    {!snapshot ? <p>Cost diagnostics are unavailable. No expense, invoice amount, or margin has been inferred.</p> : <>
      <p>Month-to-date operational accounting since {snapshot.period_start.slice(0, 10)}. Includes internal and automated-test provider traffic, and is not invoiced expenditure or external customer value.</p>
      <dl className="agent-plane__grid">
        <div><dt>Recorded AI accounting</dt><dd>{usd(snapshot.recorded_ai_cost_usd)}</dd></div>
        <div><dt>Provider-reported events</dt><dd>{count(snapshot.provider_reported_event_count)} / {count(snapshot.event_count)}</dd></div>
        <div><dt>Estimated / unknown-source events</dt><dd>{count(snapshot.estimated_or_unknown_event_count)}</dd></div>
        <div><dt>Infrastructure allocations recorded</dt><dd>{count(snapshot.allocation_count)} · {usd(snapshot.period_allocated_infrastructure_usd)}</dd></div>
        <div><dt>Unclassified workspaces</dt><dd>{count(snapshot.unclassified_organizations)}</dd></div>
        <div><dt>External human-reviewed decisions</dt><dd>{count(snapshot.external_reviewed_decisions)}</dd></div>
        <div><dt>Historical terminal-attempt ledger gaps</dt><dd>{count(snapshot.terminal_attempts_missing_a_cost_ledger_entry)}</dd></div>
        <div><dt>Verified all-in cost per decision</dt><dd>{snapshot.verified_total_cost_per_reviewed_decision_usd === null ? "Not verified" : usd(snapshot.verified_total_cost_per_reviewed_decision_usd)}</dd></div>
      </dl>
      <p>Reported AI costs are accounting estimates or provider usage, not reconciled invoices. Missing infrastructure, labor and invoice evidence must remain unknown; do not interpret unavailable total cost as zero.</p>
    </>}
  </section>;
}
