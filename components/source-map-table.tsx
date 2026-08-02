"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusDot } from "@/components/brand";
import type { EntryRoute, SourceMapEntry } from "@/lib/types";

const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function SourceMapTable({ entries, canEdit, demo }: { entries: SourceMapEntry[]; canEdit: boolean; demo: boolean }) {
  const router = useRouter();
  const lock = useRef(false);
  const [query, setQuery] = useState("");
  const [gapOnly, setGapOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [crawlerAccess, setCrawlerAccess] = useState<"open" | "partial" | "blocked">("open");
  const [route, setRoute] = useState<EntryRoute>("editorial outreach");
  const [clientPresent, setClientPresent] = useState(false);
  const [competitors, setCompetitors] = useState("");
  const [feasibility, setFeasibility] = useState<SourceMapEntry["feasibility"]>("unknown");
  const [influence, setInfluence] = useState<SourceMapEntry["influence"]>("unknown");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"review" | "action" | "">("");
  const [message, setMessage] = useState("");
  const filteredRows = useMemo(() => entries.filter((entry) => (!gapOnly || (entry.crawlerAccess !== "unknown" && !entry.clientPresent)) && `${entry.domain} ${entry.title} ${entry.route}`.toLowerCase().includes(query.toLowerCase())), [entries, query, gapOnly]);
  const [visibleCount, setVisibleCount] = useState(25);
  const rows = filteredRows.slice(0, visibleCount);
  const selectedRows = entries.filter((entry) => selected.includes(entry.id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function exportSelection() {
    if (!selectedRows.length) return;
    const columns = ["domain", "title", "url", "evidence_count", "providers", "brand_present", "competitors", "crawler_access", "route", "feasibility", "reviewed_at"];
    const lines = [columns.map(csvCell).join(","), ...selectedRows.map((entry) => [entry.domain, entry.title, entry.url, entry.evidenceCount, entry.engines.join(" | "), entry.clientPresent, entry.competitors.join(" | "), entry.crawlerAccess, entry.route, entry.feasibility, entry.reviewedAt || ""].map(csvCell).join(","))];
    const href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = href; anchor.download = `foremention-source-selection-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
    URL.revokeObjectURL(href);
  }

  async function markReviewed() {
    if (lock.current || !selectedRows.length || !confirmed || !canEdit) return;
    lock.current = true; setBusy("review"); setMessage("");
    try {
      for (const entry of selectedRows) {
        const response = await fetch(`/api/sources/${entry.id}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ crawlerAccess, clientPresent, competitors: competitors.split("\n"), route, feasibility, influence, note }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(`${entry.domain}: ${result.error || "Review failed."}`);
      }
      setMessage(demo ? "Demo reviews updated locally." : `${selectedRows.length} source review${selectedRows.length === 1 ? "" : "s"} saved with dated audit records.`);
      setSelected([]); setShowReview(false); setConfirmed(false); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the selected reviews."); }
    finally { lock.current = false; setBusy(""); }
  }

  async function addActions() {
    if (lock.current || !selectedRows.length || !canEdit) return;
    const invalid = selectedRows.find((entry) => !entry.reviewedAt || !entry.sourceId || entry.route === "unknown");
    if (invalid) { setMessage(`Review ${invalid.domain} and confirm a legitimate route before recording an action.`); return; }
    lock.current = true; setBusy("action"); setMessage("");
    try {
      for (const entry of selectedRows) {
        const response = await fetch("/api/placements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId: entry.sourceId, entryRoute: entry.route }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(`${entry.domain}: ${result.error || "Action creation failed."}`);
      }
      setMessage(`${selectedRows.length} reviewed source${selectedRows.length === 1 ? "" : "s"} added to the Action Tracker.`); setSelected([]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the selected actions."); }
    finally { lock.current = false; setBusy(""); }
  }

  const allVisibleSelected = rows.length > 0 && rows.every((entry) => selected.includes(entry.id));
  return <>
    <div className="table-tools"><label><span>Search sources</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Domain, page, or route" /></label><label className="toggle"><input type="checkbox" checked={gapOnly} onChange={(event) => setGapOnly(event.target.checked)} /><span>Show confirmed gaps only</span></label></div>
    {rows.length ? <>
      <div className="bulk-toolbar" aria-label="Source bulk actions">
        <label><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? selected.filter((id) => !rows.some((entry) => entry.id === id)) : Array.from(new Set([...selected, ...rows.map((entry) => entry.id)])))} /> Select visible</label>
        <span>{selected.length} selected</span>
        <button type="button" data-workspace-review disabled={!selected.length || !canEdit || Boolean(busy)} onClick={() => setShowReview((current) => !current)}>Mark reviewed</button>
        <button type="button" data-workspace-export disabled={!selected.length || Boolean(busy)} onClick={exportSelection}>Export selection</button>
        <button type="button" data-workspace-action disabled={!selected.length || !canEdit || Boolean(busy)} onClick={() => void addActions()}>{busy === "action" ? "Adding…" : "Add actions"}</button>
      </div>
      {showReview && <div className="bulk-review" role="group" aria-label="Review selected sources">
        <p><strong>Apply only facts you personally checked on every selected page.</strong> One shared review is appropriate only when the same finding is true for the entire selection.</p>
        <div><label>Crawler access<select value={crawlerAccess} onChange={(event) => setCrawlerAccess(event.target.value as typeof crawlerAccess)}><option>open</option><option>partial</option><option>blocked</option></select></label><label>Legitimate route<select value={route} onChange={(event) => setRoute(event.target.value as EntryRoute)}>{routes.map((value) => <option key={value}>{value}</option>)}</select></label><label>Feasibility<select value={feasibility} onChange={(event) => setFeasibility(event.target.value as SourceMapEntry["feasibility"])}><option>unknown</option><option>high</option><option>medium</option><option>low</option></select></label><label>Influence<select value={influence} onChange={(event) => setInfluence(event.target.value as SourceMapEntry["influence"])}><option>unknown</option><option>high</option><option>medium</option><option>low</option><option>emerging</option></select></label></div>
        <label className="toggle"><input type="checkbox" checked={clientPresent} onChange={(event) => setClientPresent(event.target.checked)} /><span>Our brand is present on every selected page</span></label>
        <label>Competitors present on every selected page<textarea rows={3} value={competitors} onChange={(event) => setCompetitors(event.target.value)} placeholder="One verified competitor per line" /></label>
        <label>Shared review note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was checked, and what remains uncertain?" /></label>
        <label className="toggle"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I inspected every selected page and confirm these shared facts.</span></label>
        <button className="button button--ink" type="button" disabled={!confirmed || busy === "review"} onClick={() => void markReviewed()}>{busy === "review" ? "Saving reviews…" : `Save ${selected.length} reviewed source${selected.length === 1 ? "" : "s"}`}</button>
      </div>}
      <div className="data-table"><div className="data-row data-row--head"><span># / source</span><span>Evidence</span><span>Brand review</span><span>Crawler</span><span>Entry route</span><span>Next step</span></div>{rows.map((entry) => <div className="data-row" data-workspace-item tabIndex={-1} key={entry.id}><div className="data-source"><label className="source-select"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Select ${entry.domain}`} /><span>{String(entry.rank).padStart(2,"0")}</span></label><div><a href={entry.url} target="_blank" rel="noreferrer">{entry.domain} ↗</a><small>{entry.title}</small></div></div><div><strong>{entry.evidenceCount}</strong><small>{entry.engines.join(" · ")}</small></div><div className="presence-cell"><StatusDot tone={entry.crawlerAccess === "unknown" ? "gray" : entry.clientPresent ? "green" : "red"} />{entry.crawlerAccess === "unknown" ? "Not reviewed" : entry.clientPresent ? "Present" : "Absent"}</div><div><strong className={`pill pill--${entry.crawlerAccess}`}>{entry.crawlerAccess}</strong></div><div><strong>{entry.route}</strong><small>{entry.competitors.length ? `Competitors: ${entry.competitors.join(", ")}` : "Competitor presence not reviewed"}</small></div><div><Link className="source-review-link" data-workspace-review href={`/app/sources/${entry.id}`}>{entry.crawlerAccess === "unknown" ? "Review source" : "Open record"} &rarr;</Link><small>{entry.crawlerAccess === "unknown" ? "Required before scoring" : entry.feasibility === "unknown" ? "Complete route review" : `${entry.feasibility} feasibility`}</small></div></div>)}</div>
    </> : <div className="empty-state empty-state--compact"><h2>No sources match this view.</h2><p>{gapOnly ? "No reviewed source gaps match the current search. Turn off the confirmed-gap filter or review more cited pages." : "Try a broader domain, page title, or route search."}</p><button className="text-button" type="button" onClick={() => { setQuery(""); setGapOnly(false); }}>Clear filters</button></div>}
    {filteredRows.length > visibleCount && <div className="workspace-load-more"><button className="button button--outline" type="button" onClick={() => setVisibleCount((current) => current + 25)}>Load 25 more sources</button><span>{rows.length} of {filteredRows.length} shown</span></div>}
    {message && <p className="inline-notice" role="status">{message}</p>}
    <p className="table-caption">{rows.length} of {filteredRows.length} matching sources shown. Citation counts are observed evidence. Brand presence, influence, routes, and feasibility require review before action.</p>
  </>;
}
