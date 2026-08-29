"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AttentionInbox } from "@/components/attention-inbox";
import { MeasurementScheduleControl } from "@/components/measurement-schedule-control";
import type { AttentionItem } from "@/lib/retention-loop";

function AttentionSurface() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch("/api/retention/attention", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { data: [] })
      .then((payload: { data?: AttentionItem[] }) => { if (live) { setItems(payload.data || []); setLoaded(true); } })
      .catch(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);
  if (!loaded) return <section className="panel"><span className="eyebrow">Attention</span><h2>Checking what needs you now.</h2><p className="table-caption">Only persisted workspace state can create an Attention item.</p></section>;
  return <AttentionInbox items={items} />;
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
  return <section className="panel retention-record-controls" aria-label="Recommendation Record controls">
    <div className="panel-heading"><div><span className="eyebrow">Recommendation Record</span><h2>Share or export this exact evidence boundary.</h2><p>Evidence inspection remains contained in this Recommendation Record. Shared views are read-only, expiring and revocable.</p></div></div>
    <div className="settings-actions"><button className="button button--ink" disabled={pending} onClick={() => void share()}>{pending ? "Creating…" : "Share read-only Record"}</button><a className="button button--outline" href={`/api/export/record/${encodeURIComponent(runId)}`}>Export CSV</a><Link className="button button--outline" href={`/app/runs/${encodeURIComponent(runId)}/print`}>Print / PDF</Link></div>
    {sharePath && <p className="table-caption">Share created: <Link href={sharePath}>{sharePath}</Link>. Copy it now; Foremention stores only its hash.</p>}{error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}

function SettingsExtensions() {
  return <div className="retention-extension-stack"><MeasurementScheduleControl /><section className="panel"><span className="eyebrow">Enterprise access</span><h2>SSO / SAML</h2><p>Enterprise SSO is available only for a genuinely configured workspace connection. Foremention fails closed instead of pretending SSO is active.</p><a className="button button--outline" href="/api/auth/sso?next=/app">Check SSO configuration</a></section><section className="panel"><span className="eyebrow">Billing</span><h2>Verified entitlement boundary</h2><p>Billing remains inactive until a signed provider webhook is verified. No card or paid package is implied by this interface.</p></section></div>;
}

function AnalyticsExtensions() {
  return <section className="panel retention-benchmark-boundary"><span className="eyebrow">Category context</span><h2>Benchmark unavailable</h2><p>Foremention will not manufacture a category benchmark from one workspace. Cross-workspace benchmarks require an eligible privacy-safe cohort and minimum sample threshold. Current comparisons remain bound to the same locale and market as the exact reviewed baseline.</p></section>;
}

function QuestionExtensions() {
  const clusters = ["Discovery", "Comparison", "Alternative", "Use case", "Trust", "Constraint"];
  return <section className="panel"><span className="eyebrow">Question intelligence</span><h2>Keep buyer questions organized by decision intent.</h2><p>Suggested questions never become measurements until a workspace reviewer approves them.</p><div className="chip-row">{clusters.map((cluster) => <span className="status-chip" key={cluster}>{cluster}</span>)}</div></section>;
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
