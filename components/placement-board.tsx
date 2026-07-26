"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Placement } from "@/lib/types";

const groups = [{title:"Research", stages:["identified","qualified"]}, {title:"Outreach", stages:["pitched","accepted"]}, {title:"Published", stages:["published","indexed"]}, {title:"Citation", stages:["first cited","repeatedly cited"]}, {title:"Archive", stages:["decayed","closed"]}] as const;
const stages: Placement["stage"][] = ["identified","qualified","pitched","accepted","published","indexed","first cited","repeatedly cited","decayed","closed"];

export function PlacementBoard({ placements: initialPlacements, demo }: { placements: Placement[]; demo: boolean }) {
  const router = useRouter();
  const [placements, setPlacements] = useState(initialPlacements);
  const [selected, setSelected] = useState<Placement | null>(null);
  const [nextStage, setNextStage] = useState<Placement["stage"]>("identified");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function open(item: Placement) { setSelected(item); setNextStage(item.stage); setNote(""); setEvidenceUrl(""); setMessage(""); }
  async function save() {
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      if (!demo) {
        const response = await fetch("/api/placements", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, stage: nextStage.replaceAll(" ", "_"), note, evidenceUrl }) });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not update the action.");
      }
      setPlacements((current) => current.map((item) => item.id === selected.id ? { ...item, stage: nextStage, updated: "Just now" } : item));
      setSelected((current) => current ? { ...current, stage: nextStage, updated: "Just now" } : current);
      setMessage(demo ? "Demo action updated locally." : "Action state and evidence event saved.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update the action."); }
    finally { setBusy(false); }
  }

  return <><div className="placement-board">{groups.map((group) => <section key={group.title}><header><h2>{group.title}</h2><span>{placements.filter((placement) => (group.stages as readonly string[]).includes(placement.stage)).length}</span></header>{placements.filter((placement) => (group.stages as readonly string[]).includes(placement.stage)).map((placement) => <button className="placement-card" key={placement.id} onClick={() => open(placement)} type="button"><span className="placement-stage">{placement.stage}</span><strong>{placement.source}</strong><small>{placement.page}</small><div><span>{placement.route}</span><span>{placement.promptImpact} prompts</span></div></button>)}</section>)}</div>{selected && <div className="placement-detail" role="dialog" aria-modal="true" aria-label="Action detail"><button className="detail-close" onClick={() => setSelected(null)} aria-label="Close">×</button><span className="eyebrow">{selected.id.slice(0, 8).toUpperCase()}</span><h2>{selected.source}</h2><p>{selected.page}</p><dl><div><dt>Legitimate route</dt><dd>{selected.route}</dd></div><div><dt>Owner</dt><dd>{selected.owner}</dd></div><div><dt>Potential prompt set</dt><dd>{selected.promptImpact} prompts</dd></div><div><dt>Last updated</dt><dd>{selected.updated}</dd></div></dl><div className="action-update"><label>Action state<select value={nextStage} onChange={(event) => setNextStage(event.target.value as Placement["stage"])}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label>Evidence note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What happened, and what remains unknown?" /></label><label>Evidence URL<input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://" /></label><button className="button button--ink" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save action event"}</button>{message && <p className="inline-notice" role="status">{message}</p>}</div><p className="detail-note">A stage change records workflow progress only. It does not prove indexing, citation, traffic, or revenue without separate evidence.</p></div>}</>;
}
