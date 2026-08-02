"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompetitorTracking } from "@/lib/data";

export function CompetitorTracker({ initial, canManage, demo }: { initial: CompetitorTracking[]; canManage: boolean; demo: boolean }) {
  const router = useRouter(); const lock = useRef(false);
  const [name, setName] = useState(""); const [website, setWebsite] = useState(""); const [type, setType] = useState("direct");
  const [busy, setBusy] = useState(false); const [updating, setUpdating] = useState(""); const [message, setMessage] = useState("");
  async function add(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setMessage("");
    try { const response = await fetch("/api/competitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, website, type }) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not add competitor."); setName(""); setWebsite(""); setMessage("Competitor added. Future and historical workspace evidence can now be compared against this name."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not add competitor."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function toggle(item: CompetitorTracking) {
    setUpdating(item.id); setMessage("");
    try { const response = await fetch("/api/competitors", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.active }) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Could not update competitor."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update competitor."); }
    finally { setUpdating(""); }
  }
  return <>
    {canManage && !demo && <form className="panel competitor-add" onSubmit={add} aria-busy={busy}><div><span className="eyebrow">Comparison set</span><h2>Add a brand buyers actually compare.</h2></div><label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label><label>Website (optional)<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="direct">Direct</option><option value="leader">Leader</option><option value="challenger">Challenger</option><option value="substitute">Substitute</option></select></label><button className="button button--ink" disabled={busy} type="submit">{busy ? "Adding…" : "Track competitor"}</button></form>}
    {message && <p className="inline-notice" role="status">{message}</p>}
    {initial.length ? <div className="competitor-grid">{initial.map((item) => <article className="panel" key={item.id}><div className="competitor-card__head"><div><span className="eyebrow">{item.type}</span><h2>{item.name}</h2>{item.website && <a href={item.website} target="_blank" rel="noreferrer">Website ↗</a>}</div><span className={`status-chip ${item.active ? "status-chip--active" : ""}`}>{item.active ? "tracking" : "paused"}</span></div><dl><div><dt>Answer mentions</dt><dd>{item.answerMentions} / {item.totalAnswers}</dd></div><div><dt>Mention frequency</dt><dd>{item.mentionFrequencyPct === null ? "No runs" : `${item.mentionFrequencyPct}%`}</dd></div><div><dt>Reviewed citation pages</dt><dd>{item.reviewedCitationPages}</dd></div><div><dt>Source overlap</dt><dd>{item.sourceOverlap}</dd></div><div><dt>Latest run change</dt><dd>{item.trendDelta === null ? "Needs 2 runs" : `${item.trendDelta > 0 ? "+" : ""}${item.trendDelta} pts`}</dd></div></dl><small>Exact-name observations from persisted answers and human-reviewed cited pages. This does not estimate market share.</small><button type="button" disabled={!canManage || demo || updating === item.id} onClick={() => void toggle(item)}>{updating === item.id ? "Updating…" : item.active ? "Pause tracking" : "Resume tracking"}</button></article>)}</div> : <div className="empty-state"><h2>No competitors tracked yet.</h2><p>Add only brands a real buyer would compare. Foremention will measure their observed answer mentions and reviewed source overlap after collections run.</p></div>}
  </>;
}
