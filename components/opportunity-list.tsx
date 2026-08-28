"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow } from "@/components/brand";
import type { SourceEvidenceContext } from "@/lib/data";
import type { SourceMapEntry } from "@/lib/types";
import { CommentThread } from "@/components/comment-thread";

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
      setMessage(demo ? "Demo action created locally." : `${source.domain} was added to Actions with its evidence link preserved.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add the action."); }
    finally { setBusy(""); }
  }
  const visible = rows.slice(0, visibleCount);
  return <>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="opportunity-list">{visible.map((source,index) => <article data-workspace-item tabIndex={-1} key={source.id}>
      <div className={`opportunity-score ${source.score === null ? "opportunity-score--review" : ""}`}><span>{source.score === null ? "Evidence" : "Observed evidence"}</span>{source.score === null ? <strong>Review</strong> : <><strong>{source.score}</strong><small>citation{source.score === 1 ? "" : "s"}</small></>}</div>
      <div><span className="opportunity-rank">#{index+1} · {source.type} · {source.score === null ? "verification required" : "reviewed opportunity"}</span><h2>{source.domain}</h2><p>{source.title}</p>{source.evidence && <div className="opportunity-evidence"><strong>Observed for: {source.evidence.prompt}</strong><span>{source.evidence.provider}{source.evidence.model ? ` · ${source.evidence.model}` : ""}{source.evidence.citationOrdinal ? ` · citation ${source.evidence.citationOrdinal}` : ""} · {source.evidence.observedAt}</span></div>}<div className="opportunity-meta"><span>{source.evidenceCount} citation observation{source.evidenceCount === 1 ? "" : "s"}</span><span>{source.engines.length} AI system{source.engines.length === 1 ? "" : "s"}</span>{source.score !== null && <><span>{source.influence} observed influence</span><span>{source.feasibility} feasibility</span><span>{source.route}</span></>}</div>{source.score !== null && <small>Why this is actionable: a person reviewed the cited page, recorded your brand as absent, and identified the route shown above. Foremention does not infer likely revenue or ranking impact.</small>}</div>
      <div className="opportunity-actions"><a data-workspace-review href={source.url} target="_blank" rel="noreferrer">Open cited page <Arrow /></a><button data-workspace-action type="button" disabled={busy === source.id || (!source.sourceId && !demo) || source.score === null} onClick={() => void track(source)}>{busy === source.id ? "Adding…" : source.score === null ? "Verify in Sources first" : "Create action"}</button><CommentThread entityType="priority_gap" entityId={source.id} demo={demo} /></div>
    </article>)}</div>
    {rows.length > visibleCount && <div className="workspace-load-more"><button className="button button--outline" type="button" onClick={() => setVisibleCount((current) => current + 10)}>Load 10 more opportunities</button><span>{visible.length} of {rows.length} shown</span></div>}
  </>;
}
