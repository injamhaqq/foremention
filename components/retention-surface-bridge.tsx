"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AttentionInbox } from "@/components/attention-inbox";
import { BillingControl } from "@/components/billing-control";
import { EnterpriseReadiness } from "@/components/enterprise-readiness";
import { MeasurementScheduleControl } from "@/components/measurement-schedule-control";
import type { RetentionHealth } from "@/lib/retention-health";
import type { ActivationStage, AttentionItem } from "@/lib/retention-loop";

function ContextLinks({ title, body, links }: { title: string; body: string; links: Array<[string, string]> }) {
  return <details className="panel retention-context-tools">
    <summary>Supporting tools</summary>
    <div className="retention-context-tools__body">
      <span className="eyebrow">Contextual workspace tools</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="settings-actions">
        {links.map(([href, label]) => <Link className="button button--outline" href={href} key={href}>{label}</Link>)}
      </div>
    </div>
  </details>;
}

function NextBestStep({ activation }: { activation: ActivationStage }) {
  return <section className="panel retention-next-step" data-activation-stage={activation.key}>
    <span className="eyebrow">Next best step</span>
    <h2>{activation.title}</h2>
    <p>{activation.detail}</p>
    <div className="settings-actions"><Link className={`button ${activation.complete ? "button--outline" : "button--ink"}`} href={activation.href}>{activation.complete ? "Review comparable change" : "Continue the loop"}</Link></div>
  </section>;
}

function RetentionHealthPanel({ health }: { health: RetentionHealth }) {
  return <section className="panel retention-health" data-retention-health={health.status} aria-label="Retention health">
    <span className="eyebrow">Retention health</span>
    <h2>{health.label}</h2>
    <p>{health.reason}</p>
  </section>;
}

function AttentionSurface() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [activation, setActivation] = useState<ActivationStage | null>(null);
  const [retentionHealth, setRetentionHealth] = useState<RetentionHealth | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch("/api/retention/attention", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { data: [] })
      .then((payload: { data?: AttentionItem[]; activation?: ActivationStage; retentionHealth?: RetentionHealth }) => { if (live) { setItems(payload.data || []); setActivation(payload.activation || null); setRetentionHealth(payload.retentionHealth || null); setLoaded(true); } })
      .catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);
  if (!loaded) return <section className="panel"><span className="eyebrow">Attention</span><h2>Checking what needs you now.</h2><p className="table-caption">Only persisted workspace state can create an Attention item.</p></section>;
  return <>
    {activation && <NextBestStep activation={activation} />}
    {retentionHealth && <RetentionHealthPanel health={retentionHealth} />}
    <AttentionInbox items={items} />
    <ContextLinks
      title="Move from signal to owned follow-through."
      body="Alerts, opportunities, actions, and resolution work remain available when you need the underlying workflow, without competing with the five core workspace objects."
      links={[["/app/alerts", "Alerts"], ["/app/opportunities", "Opportunities"], ["/app/placements", "Actions"], ["/app/resolutions", "Resolution Center"]]}
    />
  </>;
}

function RecordControls({ runId }: { runId: string }) {
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function share() {
    setPending(true); setError(null);
    const response = await fetch(`/api/records/${encodeURIComponent(runId)}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ includeEvidence: true, expiresInDays: 14 }) });
    const payload = await response.json().catch(() => ({})) as { data?: { path?: string }; error?: string };
    if (!response.ok || !payload.data?.path) setError(payload.error || "The read-only share could not be created.");
    else setSharePath(payload.data.path);
    setPending(false);
  }
  return <>
    <section className="panel retention-record-controls" aria-label="Recommendation Record controls">
      <div className="panel-heading"><div><span className="eyebrow">Recommendation Record</span><h2>Share or export this exact evidence boundary.</h2><p>Evidence inspection remains contained in this Recommendation Record. Shared views are read-only, expiring and revocable.</p></div></div>
      <div className="settings-actions"><button className="button button--ink" disabled={pending} onClick={() => void share()}>{pending ? "Creating…" : "Share read-only Record"}</button><a className="button button--outline" href={`/api/export/record/${encodeURIComponent(runId)}`}>Export CSV</a><Link className="button button--outline" href={`/app/runs/${encodeURIComponent(runId)}/print`}>Print / PDF</Link></div>
      {sharePath && <p className="table-caption">Share created: <Link href={sharePath}>{sharePath}</Link>. Copy it now; Foremention stores only its hash.</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    </section>
    <ContextLinks title="Inspect or publish only from the persisted Record." body="Evidence, vendor-passport output, and the agent execution trace are supporting Record tools. None creates replacement evidence or a second recommendation object." links={[["/app/evidence", "Evidence Vault"], ["/app/passport", "Vendor Passport"], ["/app/agents", "Agent Control Plane"]]} />
  </>;
}

function SettingsExtensions() {
  return <div className="retention-extension-stack retention-settings-groups" aria-label="Workspace settings extensions">
    <MeasurementScheduleControl />
    <BillingControl />
    <section className="panel"><span className="eyebrow">Enterprise access</span><h2>SSO / SAML</h2><p>Enterprise SSO is available only for a genuinely configured workspace connection. Foremention fails closed instead of pretending SSO is active.</p><a className="button button--outline" href="/api/auth/sso?next=/app">Check SSO configuration</a></section>
    <EnterpriseReadiness />
    <ContextLinks title="Workspace administration lives here." body="Team and integration setup are supporting configuration, not separate product destinations." links={[["/app/team", "Team"], ["/app/settings#integrations", "Integrations"]]} />
  </div>;
}

function AnalyticsExtensions() {
  return <>
    <section className="panel retention-benchmark-boundary" data-benchmark-state="withheld"><span className="eyebrow">Category context</span><h2>Benchmark held until the cohort is eligible.</h2><p>Foremention does not manufacture a category benchmark from one workspace. Cross-workspace context appears only after an eligible privacy-safe cohort meets the minimum sample threshold. Until then, Comparisons stays bound to your exact reviewed baseline, locale, market, provider and methodology.</p></section>
    <ContextLinks title="Use deeper analysis only when the comparison is valid." body="Outcome, weekly-intelligence, and decision-analysis tools remain available behind Comparisons, after the exact comparability boundary is satisfied." links={[["/app/outcomes", "Outcome Ledger"], ["/app/intelligence", "Intelligence Loop"], ["/app/decision-lab", "Decision Lab"]]} />
  </>;
}

function QuestionExtensions() {
  const clusters = ["Discovery", "Comparison", "Alternative", "Use case", "Trust", "Constraint"];
  return <section className="panel"><span className="eyebrow">Question intelligence</span><h2>Keep buyer questions organized by decision intent.</h2><p>These are intent labels, not filters or measurements. Suggested questions never become measurements until a workspace reviewer approves them.</p><div className="retention-intent-legend" aria-label="Question intent categories">{clusters.map((cluster) => <span className="intent-label" key={cluster}>{cluster}</span>)}</div><div className="settings-actions"><Link className="button button--outline" href="/app/competitors">Review competitors</Link></div></section>;
}

function CompetitorExtensions() {
  return <section className="panel"><span className="eyebrow">Competitor discovery</span><h2>Candidate competitors require confirmation.</h2><p>Foremention can surface a candidate only from persisted answer observations. A candidate is not added to tracking until a person confirms it; incidental mentions are never silently promoted to competitors.</p></section>;
}

function ActionExtensions() {
  return <section className="panel"><span className="eyebrow">Action operating contract</span><h2>Every action needs an owner, due date and remeasurement boundary.</h2><p>Owner and due state make follow-through explicit. Remeasurement can show what was observed after an action only when an exact comparable run exists; it never claims the action caused the change.</p></section>;
}

export function RetentionSurfaceBridge() {
  const pathname = usePathname();
  const recordMatch = pathname.match(/^\/app\/runs\/([^/]+)$/);
  return <>
    {pathname === "/app" && <AttentionSurface />}
    {pathname === "/app/settings" && <SettingsExtensions />}
    {recordMatch && <RecordControls runId={decodeURIComponent(recordMatch[1])} />}
    {pathname === "/app/analytics" && <AnalyticsExtensions />}
    {pathname === "/app/prompts" && <QuestionExtensions />}
    {pathname === "/app/competitors" && <CompetitorExtensions />}
    {pathname === "/app/placements" && <ActionExtensions />}
  </>;
}
