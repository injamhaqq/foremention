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

  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Workspace control</span>
        <h1>Settings</h1>
        <p>Account, provider readiness, data controls, plan capacity, and honest production status.</p>
      </div>
      <Link className="button button--outline" href="/app/onboarding">Revisit onboarding</Link>
    </div>
    <div className="settings-grid">
      <section className="panel">
        <span className="eyebrow">Organization</span>
        <h2>{workspace?.organizationName || "Complete onboarding"}</h2>
        <dl className="settings-list">
          <div><dt>Website</dt><dd>{workspace?.website || "Not yet set"}</dd></div>
          <div><dt>Category</dt><dd>{workspace?.category || "Not yet set"}</dd></div>
          <div><dt>Buyer questions</dt><dd>{workspace?.promptCount || 0} active</dd></div>
          <div><dt>Data boundary</dt><dd>{viewer.mode === "demo" ? "Fictional preview only" : "Your organization only"}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <span className="eyebrow">Email notifications</span><h2>Choose operational alerts.</h2>
        <EmailAlertPreferences initial={emailPreference} available={applicationEmail.available} demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Automation</span><h2>Signed workspace webhooks.</h2>
        <WebhookSettings available={webhooksReady} demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">CRM connector</span><h2>HubSpot activity history.</h2>
        <HubSpotSettings demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Knowledge connector</span><h2>Notion Source Map digest.</h2>
        <NotionSettings demo={viewer.mode === "demo"} />
      </section>

      <section className="panel" id="providers">
        <span className="eyebrow">AI collection</span>
        <h2>Provider readiness</h2>
        <div className="integration-list">
          {providers.map((provider) => <div key={provider.id}>
            <span><StatusDot tone={viewer.mode === "demo" || provider.health === "available" ? "green" : provider.health === "limited" ? "yellow" : "gray"} /><strong>{provider.label}</strong></span>
            <small>{viewer.mode === "demo" ? "Demo adapter" : !provider.configured ? "Not connected" : `${provider.health === "available" ? `Live collection proven${provider.lastTestedAt ? ` · ${provider.lastTestedAt}` : ""}` : provider.health === "limited" ? `Configured · latest attempt ${provider.latestStatus?.replaceAll("_", " ") || "failed"}${provider.lastTestedAt ? ` · ${provider.lastTestedAt}` : ""}` : "Configured · production run not yet proven"}${provider.supportsCitations ? "" : " · answer comparison only; no returned web citations"}`}</small>
          </div>)}
        </div>
        <p className="table-caption">Provider credentials stay in the secure hosting environment. Customers never paste shared platform keys into the browser. Answer-only providers can support comparison, but cannot create Source Map entries without provider-returned citations.</p>
      </section>

      <section className="panel">
        <span className="eyebrow">Operations</span>
        <h2>Production services</h2>
        <div className="integration-list">
          <div><span><StatusDot tone={jobsReady ? "green" : "gray"} /><strong>Background collection</strong></span><small>{jobsReady ? "Keys present · endpoint test required" : "Inngest connection required"}</small></div>
          <div><span><StatusDot tone={serviceReady ? "green" : "gray"} /><strong>Trusted server processing</strong></span><small>{serviceReady ? "Server secret present · tenant test required" : "Server database secret required"}</small></div>
          <div><span><StatusDot tone={viewer.mode === "demo" ? "yellow" : "green"} /><strong>Workspace database</strong></span><small>{viewer.mode === "demo" ? "Preview records" : "Supabase-backed customer records"}</small></div>
          <div><span><StatusDot tone="green" /><strong>In-app alerts</strong></span><small>Stored per user and organization</small></div>
          <div><span><StatusDot tone={applicationEmail.available ? "green" : "gray"} /><strong>Application email alerts</strong></span><small>{applicationEmail.available ? "Adapter configured · delivery test required" : "Not connected · authentication email is separate"}</small></div>
          <div><span><StatusDot tone={monitoringReady ? "green" : "gray"} /><strong>Error monitoring</strong></span><small>{monitoringReady ? "Server monitoring ready" : "Optional connection not active"}</small></div>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Team and permissions</span>
        <h2>{team.members.length} workspace member{team.members.length === 1 ? "" : "s"}</h2>
        <div className="member-row">
          <span>{viewer.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{viewer.name}</strong><small>{team.role || "member"} &middot; {viewer.email}</small></div>
          <b>{team.role === "owner" ? "Full access" : "Role-based access"}</b>
        </div>
        <div className="settings-actions"><Link className="button button--outline" href="/app/team">Manage team</Link></div>
        <p className="table-caption">Invites are expiring, single-use, and restricted to the named email. Automated application-email delivery remains unavailable until its separate provider passes production testing.</p>
      </section>

      <section className="panel">
        <span className="eyebrow">Plan and billing</span>
        <h2>{FOUNDATION_ACCESS_LIMITS.plan}</h2>
        <dl className="settings-list">
          <div><dt>Plan state</dt><dd>Founder-granted access</dd></div>
          <div><dt>Billing</dt><dd>Not connected</dd></div>
          <div><dt>Brands</dt><dd>{FOUNDATION_ACCESS_LIMITS.brands}</dd></div>
          <div><dt>Buyer questions</dt><dd>{FOUNDATION_ACCESS_LIMITS.buyerQuestions}</dd></div>
          <div><dt>Collection capacity</dt><dd>{FOUNDATION_ACCESS_LIMITS.runUnitsPerMonth} observations / month</dd></div>
          <div><dt>AI spend ceiling</dt><dd>${FOUNDATION_ACCESS_LIMITS.monthlyAiSpendCapUsd} / month</dd></div>
          <div><dt>History</dt><dd>{FOUNDATION_ACCESS_LIMITS.historyDays} days</dd></div>
        </dl>
        <p className="table-caption">This is not a paid entitlement. No card is charged until a verified billing webhook activates the purchased plan and its capacity.</p>
      </section>

      <section className="panel">
        <span className="eyebrow">Data controls</span>
        <h2>Export or close</h2>
        <p>Exports include only the current organization records your account is authorized to access.</p>
        <div className="settings-actions"><a className="button button--outline" href="/api/export/source-map">Export Source Map &darr;</a></div>
        <AccountLifecycle initialRequest={deletionRequest} owner={team.role === "owner"} demo={viewer.mode === "demo"} />
      </section>

      <section className="panel panel--wide">
        <span className="eyebrow">Collection contract</span>
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
