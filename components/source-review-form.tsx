"use client";

import { useState } from "react";
import { captureProductEvent } from "@/lib/product-analytics";
import { useRouter } from "next/navigation";
import type { EntryRoute, SourceMapEntry } from "@/lib/types";

const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];

export function SourceReviewForm({ source, demo, canEdit }: { source: SourceMapEntry; demo: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [crawlerAccess, setCrawlerAccess] = useState<SourceMapEntry["crawlerAccess"]>(source.crawlerAccess);
  const [clientPresent, setClientPresent] = useState(source.clientPresent);
  const [competitors, setCompetitors] = useState(source.competitors.join("\n"));
  const [route, setRoute] = useState(source.route);
  const [feasibility, setFeasibility] = useState(source.feasibility);
  const [influence, setInfluence] = useState(source.influence);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/sources/${source.id}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ crawlerAccess, clientPresent, competitors: competitors.split("\n"), route, feasibility, influence, note }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the source review.");
      setMessage(demo ? "Demo review saved locally. Customer data was not changed." : "Review saved with a dated audit record.");
      if (!demo) captureProductEvent("evidence_reviewed", { review_type: "source", brand_present: clientPresent, crawler_access: crawlerAccess, entry_route: route });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the source review.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="source-review-form" onSubmit={save}>
    <div><span className="eyebrow">Analyst review</span><h2>Turn an observed citation into a decision-ready record.</h2><p>Review the page itself. A citation does not prove the page contains your brand or offers a legitimate contribution route.</p></div>
    <div className="source-review-grid">
      <label>Crawler access<select value={crawlerAccess} onChange={(event) => setCrawlerAccess(event.target.value as SourceMapEntry["crawlerAccess"])}><option value="unknown" disabled>Select after inspection</option><option value="open">Open</option><option value="partial">Partial</option><option value="blocked">Blocked</option></select></label>
      <label>Editorial feasibility<select value={feasibility} onChange={(event) => setFeasibility(event.target.value as SourceMapEntry["feasibility"])}><option value="unknown">Unknown</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label>Observed influence<select value={influence} onChange={(event) => setInfluence(event.target.value as SourceMapEntry["influence"])}><option value="unknown">Unknown</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="emerging">Emerging</option></select></label>
      <label>Legitimate route<select value={route} onChange={(event) => setRoute(event.target.value as SourceMapEntry["route"])}><option value="unknown" disabled>Select after inspection</option>{routes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label className="source-review-check"><input type="checkbox" checked={clientPresent} onChange={(event) => setClientPresent(event.target.checked)} /><span>Our brand is present on this page</span></label>
      <label className="source-review-wide">Competitors actually present<textarea value={competitors} onChange={(event) => setCompetitors(event.target.value)} rows={4} placeholder={"Competitor one\nCompetitor two"} /></label>
      <label className="source-review-wide">Review note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="What was verified, what remains uncertain, and what evidence would make this actionable?" /></label>
    </div>
    <div className="source-review-actions"><small>{canEdit ? "Saving this review changes gap status and records the reviewer, time, before-state, and after-state." : "Viewer access is read-only. An owner, admin, or analyst can save this review."}</small><button className="button button--ink" type="submit" disabled={busy || !canEdit || crawlerAccess === "unknown" || route === "unknown"}>{busy ? "Saving..." : crawlerAccess === "unknown" || route === "unknown" ? "Complete required review" : "Save reviewed source"}</button></div>
    {message && <p className="inline-notice" role="status">{message}</p>}
  </form>;
}
