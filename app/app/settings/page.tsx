import Link from "next/link";
import { AccountLifecycle } from "@/components/account-lifecycle";
import { StatusDot } from "@/components/brand";
import { EmailAlertPreferences } from "@/components/email-alert-preferences";
import { requireViewer } from "@/lib/auth";
import { getApplicationEmailStatus } from "@/lib/application-email";
import { loadNotificationPreference, loadPendingDeletionRequest, loadProviderStatuses, loadTeam, loadWorkspaceSummary } from "@/lib/data";
import { FOUNDATION_ACCESS_LIMITS } from "@/lib/product-limits";
import { WebhookSettings } from "@/components/webhook-settings";
import { HubSpotSettings } from "@/components/hubspot-settings";
import { NotionSettings } from "@/components/notion-settings";
import { GoogleSheetsSettings } from "@/components/google-sheets-settings";
import { PublicReportSettings } from "@/components/public-report-settings";
import { getSecretRotationStatuses, MAX_SECRET_AGE_DAYS } from "@/lib/secret-rotation";

export default async function SettingsPage() {
  const viewer = await requireViewer("/app/settings");
  const [workspace, team, deletionRequest, providers, emailPreference] = await Promise.all([
    loadWorkspaceSummary(viewer),
    loadTeam(viewer),
    loadPendingDeletionRequest(viewer),
    loadProviderStatuses(viewer),
    loadNotificationPreference(viewer),
  ]);
  const applicationEmail = getApplicationEmailStatus();
  const jobsReady = viewer.mode === "demo" || Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
  const serviceReady = viewer.mode === "demo" || Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const monitoringReady = Boolean(process.env.SENTRY_DSN);
  const webhooksReady = Boolean(process.env.WEBHOOK_SIGNING_SECRET && process.env.INNGEST_EVENT_KEY);
  const secretRotation = getSecretRotationStatuses();
  const connectedProviders = viewer.mode === "demo" ? providers.length : providers.filter((provider) => provider.configured).length;
  const provenProviders = viewer.mode === "demo" ? providers.length : providers.filter((provider) => provider.health === "available").length;

  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Workspace</span>
        <h1>Settings</h1>
        <p>Manage your workspace, monitoring, integrations, notifications, security, and data controls.</p>
      </div>
      <Link className="button button--outline" href="/app/onboarding">Revisit onboarding</Link>
    </div>
    <div className="settings-grid">
      <section className="panel">
        <span className="eyebrow">Workspace profile</span>
        <h2>{workspace?.organizationName || "Complete onboarding"}</h2>
        <dl className="settings-list">
          <div><dt>Website</dt><dd>{workspace?.website || "Not yet set"}</dd></div>
          <div><dt>Category</dt><dd>{workspace?.category || "Not yet set"}</dd></div>
          <div><dt>Questions monitored</dt><dd>{workspace?.promptCount || 0} active</dd></div>
          <div><dt>Data boundary</dt><dd>{viewer.mode === "demo" ? "Fictional preview only" : "Your organization only"}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <span className="eyebrow">Notifications</span><h2>Choose the alerts you want.</h2>
        <EmailAlertPreferences initial={emailPreference} available={applicationEmail.available} demo={viewer.mode === "demo"} />
      </section>

      <section className="panel" id="providers">
        <span className="eyebrow">AI monitoring</span>
        <h2>Monitoring readiness</h2>
        <dl className="settings-list">
          <div><dt>Connected systems</dt><dd>{connectedProviders}</dd></div>
          <div><dt>Proven in a real run</dt><dd>{provenProviders}</dd></div>
        </dl>
        <p className="table-caption">Foremention keeps exact provider and model provenance with each observation. You do not need to manage model IDs during normal monitoring.</p>
        <details>
          <summary>View provider details</summary>
          <div className="integration-list">
            {providers.map((provider) => <div key={provider.id}>
              <span><StatusDot tone={viewer.mode === "demo" || provider.health === "available" ? "green" : provider.health === "limited" ? "yellow" : "gray"} /><strong>{provider.label}</strong></span>
              <small>{viewer.mode === "demo" ? "Demo adapter" : !provider.configured ? "Not connected" : provider.health === "available" ? `Ready${provider.lastTestedAt ? ` · last proven ${provider.lastTestedAt}` : ""}` : provider.health === "limited" ? `Needs attention${provider.lastTestedAt ? ` · checked ${provider.lastTestedAt}` : ""}` : "Connected · first production proof still needed"}</small>
            </div>)}
          </div>
          <p className="table-caption">Some systems return citations and can populate Sources. Answer-only systems support answer comparison but cannot create cited-source evidence on their own.</p>
        </details>
      </section>

      <section className="panel panel--wide" id="integrations">
        <span className="eyebrow">Integrations</span><h2>Signed workspace webhooks.</h2>
        <WebhookSettings available={webhooksReady} demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">CRM</span><h2>HubSpot activity history.</h2>
        <HubSpotSettings demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Knowledge</span><h2>Notion Source Map digest.</h2>
        <NotionSettings demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Data export</span><h2>Google Sheets export.</h2>
        <GoogleSheetsSettings demo={viewer.mode === "demo"} />
      </section>

      <section className="panel">
        <span className="eyebrow">Team</span>
        <h2>{team.members.length} workspace member{team.members.length === 1 ? "" : "s"}</h2>
        <div className="member-row">
          <span>{viewer.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{viewer.name}</strong><small>{team.role || "member"} &middot; {viewer.email}</small></div>
          <b>{team.role === "owner" ? "Full access" : "Role-based access"}</b>
        </div>
        <div className="settings-actions"><Link className="button button--outline" href="/app/team">Manage team</Link></div>
      </section>

      <section className="panel">
        <span className="eyebrow">Plan</span>
        <h2>{FOUNDATION_ACCESS_LIMITS.plan}</h2>
        <dl className="settings-list">
          <div><dt>Plan state</dt><dd>Founder-granted access</dd></div>
          <div><dt>Billing</dt><dd>Not connected</dd></div>
          <div><dt>Brands</dt><dd>{FOUNDATION_ACCESS_LIMITS.brands}</dd></div>
          <div><dt>Buyer questions</dt><dd>{FOUNDATION_ACCESS_LIMITS.buyerQuestions}</dd></div>
          <div><dt>Monthly observation capacity</dt><dd>{FOUNDATION_ACCESS_LIMITS.runUnitsPerMonth}</dd></div>
          <div><dt>History</dt><dd>{FOUNDATION_ACCESS_LIMITS.historyDays} days</dd></div>
        </dl>
        <p className="table-caption">This is not a paid entitlement. No card is charged until a verified billing webhook activates a purchased plan.</p>
      </section>

      <section className="panel">
        <span className="eyebrow">Data & privacy</span>
        <h2>Export or close</h2>
        <p>Exports include only the current organization records your account is authorized to access. Complete ZIP archives are restricted to the workspace owner and exclude credentials and authentication secrets.</p>
        <div className="settings-actions"><a className="button button--outline" href="/api/export/source-map">Export Sources &darr;</a>{team.role === "owner" && viewer.mode !== "demo" ? <a className="button button--ink" href="/api/export/workspace">Export full workspace ZIP &darr;</a> : <span className="button button--ink" aria-disabled="true">Full export &middot; owner only</span>}</div>
        <AccountLifecycle initialRequest={deletionRequest} owner={team.role === "owner"} demo={viewer.mode === "demo"} organizationName={workspace?.organizationName || "Foremention workspace"} />
      </section>

      <section className="panel">
        <span className="eyebrow">Public reporting</span><h2>Owner-controlled visibility.</h2>
        <PublicReportSettings demo={viewer.mode === "demo"} domain={workspace?.website} />
      </section>

      <section className="panel panel--wide">
        <details>
          <summary>Advanced operations and security</summary>
          <div className="integration-list">
            <div><span><StatusDot tone={jobsReady ? "green" : "gray"} /><strong>Background collection</strong></span><small>{jobsReady ? "Configured" : "Needs configuration"}</small></div>
            <div><span><StatusDot tone={serviceReady ? "green" : "gray"} /><strong>Trusted server processing</strong></span><small>{serviceReady ? "Configured" : "Needs configuration"}</small></div>
            <div><span><StatusDot tone={viewer.mode === "demo" ? "yellow" : "green"} /><strong>Workspace database</strong></span><small>{viewer.mode === "demo" ? "Preview records" : "Customer records enabled"}</small></div>
            <div><span><StatusDot tone={applicationEmail.available ? "green" : "gray"} /><strong>Application email</strong></span><small>{applicationEmail.available ? "Configured" : "Not connected"}</small></div>
            <div><span><StatusDot tone={monitoringReady ? "green" : "gray"} /><strong>Error monitoring</strong></span><small>{monitoringReady ? "Configured" : "Not connected"}</small></div>
          </div>
          <h3>Secret rotation</h3>
          <p>Foremention never displays secret values. Rotation dates are kept only as operational metadata so old credentials can be replaced before they become a risk.</p>
          <div className="integration-list">
            {secretRotation.map((item) => <div key={item.dateVariable}>
              <span><StatusDot tone={item.state === "current" ? "green" : item.state === "due" ? "yellow" : "gray"} /><strong>{item.label}</strong></span>
              <small>{item.state === "current" ? `Recorded ${item.ageDays} days ago` : item.state === "due" ? `Rotation due · ${item.ageDays} days since the recorded change` : `Record the next rotation date privately (${MAX_SECRET_AGE_DAYS}-day reminder)`}</small>
            </div>)}
          </div>
        </details>
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Evidence standard</span>
        <h2>What Foremention records.</h2>
        <ol className="access-steps">
          <li>Only active buyer questions selected by an authorized workspace member.</li>
          <li>The exact provider, model, collection time, answer, and returned citations.</li>
          <li>Partial failures as failures, never filled with estimates.</li>
          <li>Human review before observations enter customer-facing analytics.</li>
        </ol>
      </section>
    </div>
  </main>;
}
