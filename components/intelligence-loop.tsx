"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Arrow } from "@/components/brand";
import type { WeeklyIntelligence } from "@/lib/intelligence-loop";

const signed = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}${suffix}`;
const cost = (value: number | null) => value === null ? "Not recorded" : `$${value < .01 ? value.toFixed(4) : value.toFixed(2)}`;

export function IntelligenceLoop({ intelligence }: { intelligence: WeeklyIntelligence }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return intelligence.searchRecords.slice(0, 8);
    return intelligence.searchRecords.filter((record) => `${record.kind} ${record.title} ${record.detail} ${record.meta}`.toLowerCase().includes(normalized)).slice(0, 24);
  }, [intelligence.searchRecords, normalized]);
  const latest = intelligence.latest;
  const previous = intelligence.previous;
  const presenceDelta = latest && previous ? latest.presence - previous.presence : null;
  const citationDelta = latest && previous ? latest.citations - previous.citations : null;
  const answerDelta = latest && previous ? latest.answers - previous.answers : null;
  const costDelta = latest?.costUsd !== null && latest?.costUsd !== undefined && previous?.costUsd !== null && previous?.costUsd !== undefined
    ? latest.costUsd - previous.costUsd
    : null;

  return <>
    {intelligence.telemetry === "fictional" && <div className="demo-disclosure"><strong>Fictional product demonstration</strong><span>All records on this page demonstrate the weekly workflow. They are not customer metrics or live provider results.</span></div>}
    <section className="intelligence-loop" aria-labelledby="intelligence-loop-title">
      <div className="intelligence-loop__intro">
        <div><span className="eyebrow">Foremention Intelligence Loop</span><h2 id="intelligence-loop-title">Evidence in. One next action out.</h2></div>
        <p>{intelligence.cadence.description}</p>
      </div>
      <ol className="intelligence-loop__steps">
        {["Search evidence", "Compare runs", "See changes", "Check confidence + cost", "Take one action"].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}
      </ol>
    </section>

    <section className="weekly-action">
      <div><span className={`decision-priority decision-priority--${intelligence.nextAction.priority}`}>{intelligence.nextAction.priority}</span><span className="eyebrow">Prioritized next action</span><h2>{intelligence.nextAction.title}</h2><p>{intelligence.nextAction.reason}</p></div>
      <Link className="button button--ink" href={intelligence.nextAction.href}>{intelligence.nextAction.cta} <Arrow /></Link>
    </section>

    <div className="metric-grid intelligence-metrics">
      <article><span>Reviewed brand presence</span><strong>{latest ? `${latest.presence}%` : "—"}</strong><small>{presenceDelta === null ? "Needs a comparable run" : `${signed(presenceDelta, " pts")} vs previous`}</small></article>
      <article><span>Returned citations</span><strong>{latest?.citations ?? "—"}</strong><small>{citationDelta === null ? "Needs a comparable run" : `${signed(citationDelta)} vs previous`}</small></article>
      <article><span>Verified answers</span><strong>{latest?.answers ?? "—"}</strong><small>{answerDelta === null ? "Latest reviewed baseline" : `${signed(answerDelta)} vs previous`}</small></article>
      <article><span>Recorded run cost</span><strong>{cost(latest?.costUsd ?? null)}</strong><small>{costDelta === null ? latest?.costSource || "No cost trace" : `${costDelta > 0 ? "+" : ""}${cost(costDelta)} vs previous`}</small></article>
    </div>

    <div className="intelligence-grid">
      <section className="panel panel--flush run-compare">
        <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Comparable evidence</span><h2>Latest versus previous reviewed run.</h2></div>{latest && <Link href={`/app/runs/${latest.id}`}>Inspect latest <Arrow /></Link>}</div>
        {latest ? <div className="run-compare__table">
          <div className="run-compare__row run-compare__row--head"><span>Metric</span><span>{previous?.date || "No previous run"}</span><span>{latest.date}</span><span>Change</span></div>
          {[
            ["Brand presence", previous ? `${previous.presence}%` : "—", `${latest.presence}%`, presenceDelta === null ? "Baseline" : signed(presenceDelta, " pts")],
            ["First mention", previous ? `${previous.firstMention}%` : "—", `${latest.firstMention}%`, previous ? signed(latest.firstMention - previous.firstMention, " pts") : "Baseline"],
            ["Verified answers", previous?.answers ?? "—", latest.answers, answerDelta === null ? "Baseline" : signed(answerDelta)],
            ["Returned citations", previous?.citations ?? "—", latest.citations, citationDelta === null ? "Baseline" : signed(citationDelta)],
            ["Recorded cost", previous ? cost(previous.costUsd) : "—", cost(latest.costUsd), costDelta === null ? "Baseline" : `${costDelta > 0 ? "+" : ""}${cost(costDelta)}`],
          ].map(([label, before, after, change]) => <div className="run-compare__row" key={label}><strong>{label}</strong><span>{before}</span><span>{after}</span><span>{change}</span></div>)}
        </div> : <div className="empty-state"><h2>No reviewed run exists yet.</h2><p>This page compares reviewed runs and turns exact changes into one next action. Start a collection, then approve its evidence.</p><Link className="button button--ink" href="/app/runs">Create the first baseline <Arrow /></Link></div>}
      </section>

      <section className="panel panel--flush confidence-panel">
        <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Confidence without a magic score</span><h2>{intelligence.confidence}</h2></div></div>
        <div className="confidence-checks">{intelligence.confidenceChecks.map((check) => <article className={`confidence-check confidence-check--${check.state}`} key={check.label}><div><span>{check.label}</span><strong>{check.value}</strong></div><p>{check.detail}</p></article>)}</div>
      </section>
    </div>

    <section className="panel panel--flush change-feed">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">What changed</span><h2>Exact differences. No invented interpretation.</h2></div></div>
      <div>{intelligence.changes.map((change) => <article className={`change-record change-record--${change.tone}`} key={change.id}><span>{change.kind}</span><div><strong>{change.title}</strong><p>{change.detail}</p></div><Link href={change.href}>Inspect <Arrow /></Link></article>)}</div>
    </section>

    <section className="panel panel--flush evidence-search">
      <div className="evidence-search__header">
        <div><span className="eyebrow">Workspace evidence search</span><h2>Find the answer, source, proof, or approved claim.</h2></div>
        <label><span className="sr-only">Search workspace evidence</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, answers, domains, evidence, or claims" /></label>
      </div>
      <div className="evidence-search__results" aria-live="polite">
        {results.length ? results.map((record) => <Link href={record.href} key={record.id}><span>{record.kind}</span><div><strong>{record.title}</strong><p>{record.detail}</p><small>{record.meta}</small></div><Arrow /></Link>) : <div className="empty-state empty-state--compact"><h2>{normalized ? "No matching evidence." : "No searchable evidence yet."}</h2><p>{normalized ? "Try a buyer question, provider, domain, evidence title, or approved claim." : "Reviewed answers, mapped sources, uploaded proof, and approved claims become searchable here."}</p>{!normalized && <Link className="text-link" href="/app/runs">Collect evidence first <Arrow /></Link>}</div>}
      </div>
      <p className="table-caption">{normalized ? `${results.length} matching record${results.length === 1 ? "" : "s"}` : `Showing ${results.length} of ${intelligence.searchRecords.length} searchable reviewed records`}. Unreviewed answers remain excluded.</p>
    </section>
  </>;
}
