"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow } from "@/components/brand";
import type { SourceEvidenceContext } from "@/lib/data";
import type { SourceMapEntry } from "@/lib/types";

type RankedSource = SourceMapEntry & { score: number | null; evidence?: SourceEvidenceContext };

export function OpportunityList({ rows, demo }: { rows: RankedSource[]; demo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  async function track(source: RankedSource) {
    if (!source.sourceId && !demo) return;
    setBusy(source.id); setMessage("");
    try {
      const response = await fetch("/api/placements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId: source.sourceId || source.id, entryRoute: source.route }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not add the action.");
      setMessage(demo ? "Demo action created locally." : `${source.domain} was added to the Action Tracker.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add the action."); }
    finally { setBusy(""); }
  }
  const visible = rows.slice(0, visibleCount);
  return <>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="opportunity-list">{visible.map((source,index) => <article data-workspace-item tabIndex={-1} key={source.id}>
      <div className={`opportunity-score ${source.score === null ? "opportunity-score--review" : ""}`}><span>{source.score === null ? "Evidence" : "Reviewed priority"}</span>{source.score === null ? <strong>Review</strong> : <><strong>{source.score}</strong><small>/100</small></>}</div>
      <div><span className="opportunity-rank">#{index+1} · {source.type} · {source.score === null ? "verification required" : "confirmed gap"}</span><h2>{source.domain}</h2><p>{source.title}</p>{source.evidence && <div className="opportunity-evidence"><strong>Observed for: {source.evidence.prompt}</strong><span>{source.evidence.provider}{source.evidence.model ? ` · ${source.evidence.model}` : ""}{source.evidence.citationOrdinal ? ` · citation ${source.evidence.citationOrdinal}` : ""} · {source.evidence.observedAt}</span></div>}<div className="opportunity-meta"><span>{source.evidenceCount} citation observation{source.evidenceCount === 1 ? "" : "s"}</span><span>{source.engines.length} provider{source.engines.length === 1 ? "" : "s"}</span>{source.score !== null && <><span>{source.influence} influence</span><span>{source.feasibility} feasibility</span><span>{source.route}</span></>}</div></div>
      <div className="opportunity-actions"><a data-workspace-review href={`/app/sources/${source.id}`}>Inspect evidence <Arrow /></a><button data-workspace-action type="button" disabled={busy === source.id || (!source.sourceId && !demo) || source.score === null} onClick={() => void track(source)}>{busy === source.id ? "Adding…" : source.score === null ? "Verify before tracking" : "Track action"}</button></div>
    </article>)}</div>
    {rows.length > visibleCount && <div className="workspace-load-more"><button className="button button--outline" type="button" onClick={() => setVisibleCount((current) => current + 10)}>Load 10 more gaps</button><span>{visible.length} of {rows.length} shown</span></div>}
  </>;
}
