import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { requireViewer } from "@/lib/auth";

export default async function SettingsPage() {
  const viewer = await requireViewer("/app/settings");
  return (
    <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Workspace control</span><h1>Settings</h1><p>Organization, access, integrations, exports, and account boundaries for {viewer.email}.</p></div><Link className="button button--outline" href="/app/onboarding">Revisit onboarding</Link></div>
      <div className="settings-grid">
        <section className="panel"><span className="eyebrow">Organization</span><h2>Northstar HR</h2><dl className="settings-list"><div><dt>Domain</dt><dd>northstarhr.example</dd></div><div><dt>Category</dt><dd>HR software for distributed teams</dd></div><div><dt>Workspace mode</dt><dd>{viewer.mode === "demo" ? "Fictional demo" : "Live Supabase"}</dd></div></dl></section>
        <section className="panel"><span className="eyebrow">Integrations</span><h2>Data access</h2><div className="integration-list"><div><span><StatusDot tone="gray" /><strong>Google Analytics 4</strong></span><a href="#integration-access">Review access</a></div><div><span><StatusDot tone="gray" /><strong>HubSpot CRM</strong></span><a href="#integration-access">Review access</a></div><div><span><StatusDot tone={viewer.mode === "demo" ? "yellow" : "green"} /><strong>Supabase</strong></span><small>{viewer.mode === "demo" ? "Demo fixture" : "Connected"}</small></div></div></section>
        <section className="panel"><span className="eyebrow">Team and permissions</span><h2>Least-privilege access</h2><div className="member-row"><span>M</span><div><strong>Maya Chen</strong><small>Owner · demo@foremention.example</small></div><b>Full access</b></div><p className="table-caption">Invite and role mutation are disabled in demo mode.</p></section>
        <section className="panel"><span className="eyebrow">Data controls</span><h2>Export or close</h2><p>Exports include prompt, run, source, opportunity, placement, and evidence records. Production deletion follows the signed retention policy.</p><div className="settings-actions"><a className="button button--outline" href="/api/export/source-map">Export Source Map ↓</a><span className="danger-button is-disabled">Deletion requires owner re-authentication</span></div></section>
        <section className="panel panel--wide" id="integration-access"><span className="eyebrow">Connection standard</span><h2>Authorize data without sharing passwords.</h2><p>Use read-only or minimum-required roles, workspace-owner authorization, named integration owners, and a revocation date. Secrets belong in the deployment secret manager; the database stores only secret references.</p><ol className="access-steps"><li>Approve the exact analytics or CRM scope.</li><li>Grant the minimum required role to the Foremention integration.</li><li>Record the integration owner and review date.</li><li>Test one import and verify attribution labels before enabling scheduled sync.</li></ol></section>
        <section className="panel" id="evidence-import"><span className="eyebrow">Evidence intake</span><h2>Prepare verified claims</h2><p>Live evidence needs a project, item owner, source URL or approved file, usage rights, verification date, limitations, and expiry date. Demo mode remains read-only so sample data cannot be mistaken for customer proof.</p></section>
      </div>
    </main>
  );
}
