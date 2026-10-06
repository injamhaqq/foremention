"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import type { SourceEvidenceContext } from "@/lib/data";
import type { SourceMapEntry } from "@/lib/types";
import { CommentThread } from "@/components/comment-thread";

type RankedSource = SourceMapEntry & { score: number | null; evidence?: SourceEvidenceContext };

export function OpportunityList({ rows, demo }: { rows: RankedSource[]; demo: boolean }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const visible = rows.slice(0, visibleCount);
  return <>
    <div className="opportunity-list">{visible.map((source,index) => <article data-workspace-item tabIndex={-1} key={source.id}>
      <div className={`opportunity-score ${source.score === null ? "opportunity-score--review" : ""}`}><span>{source.score === null ? "Evidence" : "Observed evidence"}</span>{source.score === null ? <strong>Review</strong> : <><strong>{source.score}</strong><small>citation{source.score === 1 ? "" : "s"}</small></>}</div>
      <div><span className="opportunity-rank">#{index+1} · {source.type} · {source.score === null ? "verification required" : "reviewed opportunity"}</span><h2>{source.domain}</h2><p>{source.title}</p>{source.evidence && <div className="opportunity-evidence"><strong>Observed for: {source.evidence.prompt}</strong><span>{source.evidence.provider}{source.evidence.model ? ` · ${source.evidence.model}` : ""}{source.evidence.citationOrdinal ? ` · citation ${source.evidence.citationOrdinal}` : ""} · {source.evidence.observedAt}</span></div>}<div className="opportunity-meta"><span>{source.evidenceCount} citation observation{source.evidenceCount === 1 ? "" : "s"}</span><span>{source.engines.length} AI system{source.engines.length === 1 ? "" : "s"}</span>{source.score !== null && <><span>{source.influence} observed influence</span><span>{source.feasibility} feasibility</span><span>{source.route}</span></>}</div>{source.score !== null && <small>Why this is actionable: a person reviewed the cited page, recorded your brand as absent, and identified the route shown above. Foremention does not infer likely revenue or ranking impact.</small>}</div>
      <div className="opportunity-actions"><a data-workspace-review href={source.url} target="_blank" rel="noreferrer">Open cited page <Arrow /></a><Link data-workspace-action href={source.score === null || demo ? "/app/source-map#source-review-queue" : `/app/resolutions?source=${encodeURIComponent(source.url)}`}>{source.score === null || demo ? "Review source evidence" : "Review decision"}</Link><small>{demo ? "Fictional demo · read-only" : source.score === null ? "Review the evidence before proposing a change." : "Inspect the problem and supporting records before creating a decision draft."}</small><CommentThread entityType="priority_gap" entityId={source.id} demo={demo} /></div>
    </article>)}</div>
    {rows.length > visibleCount && <div className="workspace-load-more"><button className="button button--outline" type="button" onClick={() => setVisibleCount((current) => current + 10)}>Load 10 more opportunities</button><span>{visible.length} of {rows.length} shown</span></div>}
  </>;
}
