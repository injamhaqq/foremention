"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow } from "@/components/brand";
import type { SourceMapEntry } from "@/lib/types";

type RankedSource = SourceMapEntry & { score: number };

export function OpportunityList({ rows, demo }: { rows: RankedSource[]; demo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function track(source: RankedSource) {
    if (!source.sourceId) return;
    setBusy(source.id); setMessage("");
    try {
      const response = await fetch("/api/placements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId: source.sourceId, entryRoute: source.route }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not add the action.");
      setMessage(demo ? "Demo action created locally." : `${source.domain} was added to the Action Tracker.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add the action."); }
    finally { setBusy(""); }
  }
  return <>{message && <p className="inline-notice" role="status">{message}</p>}<div className="opportunity-list">{rows.map((source,index) => <article key={source.id}><div className="opportunity-score"><span>Priority</span><strong>{source.score}</strong><small>/100</small></div><div><span className="opportunity-rank">#{index+1} · {source.type}</span><h2>{source.domain}</h2><p>{source.title}</p><div className="opportunity-meta"><span>{source.evidenceCount} observations</span><span>{source.influence} influence</span><span>{source.feasibility} feasibility</span><span>{source.route}</span></div></div><div className="opportunity-actions"><a href={`/app/sources/${source.id}`}>Open record <Arrow /></a><button type="button" disabled={busy === source.id || !source.sourceId} onClick={() => void track(source)}>{busy === source.id ? "Adding…" : "Track action"}</button></div></article>)}</div></>;
}
