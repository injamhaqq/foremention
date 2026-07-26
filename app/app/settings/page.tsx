import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { getProviderStatuses, loadWorkspaceSummary } from "@/lib/data";
import { FOUNDATION_ACCESS_LIMITS } from "@/lib/product-limits";

export default async function SettingsPage() {
  const viewer = await requireViewer("/app/settings");
  const workspace = await loadWorkspaceSummary(viewer);
  const providers = getProviderStatuses();
  const jobsReady = viewer.mode === "demo" || Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
  const monitoringReady = Boolean(process.env.SENTRY_DSN);

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Workspace control</span><h1>Settings</h1><p>Account, provider readiness, data controls, plan capacity, and honest production status.</p></div><Link className="button button--outline" href="/app/onboarding">Revisit onboarding</Link></div>
    <div className="settings-grid">
      <section className="panel"><span className="eyebrow">Organization</span><h2>{workspace?.organizationName || "Complete onboarding"}</h2><dl className="settings-list"><div><dt>Website</dt><dd>{workspace?.website || "Not yet set"}</dd></div><div><dt>Category</dt><dd>{workspace?.category || "Not yet set"}</dd></div><div><dt>Buyer questions</dt><dd>{workspace?.promptCount || 0} active</dd></div><div><dt>Data boundary</dt><dd>{viewer.mode === "demo" ? "Fictional preview only" : "Your organization only"}</dd></div></dl></section>
      <section className="panel" id="providers"><span className="eyebrow">AI collection</span><h2>Provider readiness</h2><div className="integration-list">{providers.map((provider) => <div key={provider.id}><span><StatusDot tone={viewer.mode === "demo" || provider.configured ? "green" : "gray"} /><strong>{provider.label}</strong></span><small>{viewer.mode === "demo" ? "Demo adapter" : provider.configured ? "Server connection ready" : "Not connected"}</small></div>)}</div><p className="table-caption">Provider credentials stay in the secure hosting environment. Customers never paste shared platform keys into the browser.</p></section>
      <section className="panel"><span className="eyebrow">Operations</span><h2>Production services</h2><div className="integration-list"><div><span><StatusDot tone={jobsReady ? "green" : "gray"} /><strong>Background collection</strong></span><small>{jobsReady ? "Ready" : "Inngest connection required"}</small></div><div><span><StatusDot tone={viewer.mode === "demo" ? "yellow" : "green"} /><strong>Workspace database</strong></span><small>{viewer.mode === "demo" ? "Preview records" : "Supabase-backed"}</small></div><div><span><StatusDot tone={monitoringReady ? "green" : "gray"} /><strong>Error monitoring</strong></span><small>{monitoringReady ? "Server monitoring ready" : "Optional connection not active"}</small></div></div></section>
      <section className="panel"><span className="eyebrow">Team and permissions</span><h2>Workspace owner</h2><div className="member-row"><span>{viewer.name.slice(0, 1).toUpperCase()}</span><div><strong>{viewer.name}</strong><small>Owner &middot; {viewer.email}</small></div><b>Full access</b></div><p className="table-caption">Additional seats remain unavailable until team permissions and paid entitlements are connected.</p></section>
      <section className="panel"><span className="eyebrow">Plan and billing</span><h2>{FOUNDATION_ACCESS_LIMITS.plan}</h2><dl className="settings-list"><div><dt>Plan state</dt><dd>Founder-granted access</dd></div><div><dt>Billing</dt><dd>Not connected</dd></div><div><dt>Brands</dt><dd>{FOUNDATION_ACCESS_LIMITS.brands}</dd></div><div><dt>Buyer questions</dt><dd>{FOUNDATION_ACCESS_LIMITS.buyerQuestions}</dd></div><div><dt>Collection capacity</dt><dd>{FOUNDATION_ACCESS_LIMITS.runUnitsPerMonth} observations / month</dd></div><div><dt>History</dt><dd>{FOUNDATION_ACCESS_LIMITS.historyDays} days</dd></div></dl><p className="table-caption">This is not a paid entitlement. No card is charged until a verified billing webhook activates the purchased plan and its capacity.</p></section>
      <section className="panel"><span className="eyebrow">Data controls</span><h2>Export or close</h2><p>Exports include the current Source Map records your account can access. Account deletion remains disabled until owner re-authentication and retention handling are implemented.</p><div className="settings-actions"><a className="button button--outline" href="/api/export/source-map">Export Source Map &darr;</a><span className="danger-button is-disabled">Deletion not yet available</span></div></section>
      <section className="panel panel--wide"><span className="eyebrow">Collection contract</span><h2>What Foremention records.</h2><ol className="access-steps"><li>Only active buyer questions selected by the workspace owner.</li><li>The exact provider, model, collection time, answer, and returned citations.</li><li>Partial failures as failures, never filled with estimates.</li><li>Human review before observations enter customer-facing analytics.</li></ol></section>
    </div>
  </main>;
}
