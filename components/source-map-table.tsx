"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusDot } from "@/components/brand";
import type { SourceMapEntry } from "@/lib/types";

export function SourceMapTable({ entries }: { entries: SourceMapEntry[] }) {
  const [query, setQuery] = useState("");
  const [gapOnly, setGapOnly] = useState(false);
  const rows = useMemo(() => entries.filter((entry) => (!gapOnly || (entry.crawlerAccess !== "unknown" && !entry.clientPresent)) && `${entry.domain} ${entry.title} ${entry.route}`.toLowerCase().includes(query.toLowerCase())), [entries, query, gapOnly]);
  return <><div className="table-tools"><label><span>Search sources</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Domain, page, or route" /></label><label className="toggle"><input type="checkbox" checked={gapOnly} onChange={(event) => setGapOnly(event.target.checked)} /><span>Show confirmed gaps only</span></label></div><div className="data-table"><div className="data-row data-row--head"><span># / source</span><span>Evidence</span><span>Brand review</span><span>Crawler</span><span>Entry route</span><span>Next step</span></div>{rows.map((entry) => <div className="data-row" key={entry.id}><div className="data-source"><span>{String(entry.rank).padStart(2,"0")}</span><div><a href={entry.url} target="_blank" rel="noreferrer">{entry.domain} ↗</a><small>{entry.title}</small></div></div><div><strong>{entry.evidenceCount}</strong><small>{entry.engines.join(" · ")}</small></div><div className="presence-cell"><StatusDot tone={entry.crawlerAccess === "unknown" ? "gray" : entry.clientPresent ? "green" : "red"} />{entry.crawlerAccess === "unknown" ? "Not reviewed" : entry.clientPresent ? "Present" : "Absent"}</div><div><strong className={`pill pill--${entry.crawlerAccess}`}>{entry.crawlerAccess}</strong></div><div><strong>{entry.route}</strong><small>{entry.competitors.length ? `Competitors: ${entry.competitors.join(", ")}` : "Competitor presence not reviewed"}</small></div><div><Link className="source-review-link" href={`/app/sources/${entry.id}`}>{entry.crawlerAccess === "unknown" ? "Review source" : "Open record"} &rarr;</Link><small>{entry.crawlerAccess === "unknown" ? "Required before scoring" : entry.feasibility === "unknown" ? "Complete route review" : `${entry.feasibility} feasibility`}</small></div></div>)}</div><p className="table-caption">{rows.length} sources shown. Citation counts are observed evidence. Brand presence, influence, routes, and feasibility require review before action.</p></>;
}
