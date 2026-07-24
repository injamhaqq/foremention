"use client";

import { useMemo, useState } from "react";
import type { WorkspacePrompt } from "@/lib/data";

export function PromptLibrary({ initialPrompts, demo }: { initialPrompts: WorkspacePrompt[]; demo: boolean }) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => prompts.filter((prompt) => filter === "All" || prompt.cluster === filter), [prompts, filter]);
  const clusters = ["All", ...Array.from(new Set(prompts.map((prompt) => prompt.cluster)))];
  return <div><div className="prompt-tools"><label>Cluster<select value={filter} onChange={(event) => setFilter(event.target.value)}>{clusters.map(value => <option key={value}>{value}</option>)}</select></label><span>{prompts.filter(prompt => prompt.approved).length} of {prompts.length} approved</span></div>{visible.length ? <div className="prompt-list">{visible.map(prompt => <article key={prompt.id}><div><span>{prompt.cluster}</span><strong>{prompt.text}</strong></div>{demo ? <button className={prompt.approved ? "is-approved" : ""} type="button" aria-pressed={prompt.approved} onClick={() => setPrompts(current => current.map(item => item.id === prompt.id ? {...item, approved: !item.approved} : item))}>{prompt.approved ? "Approved" : "Needs review"}</button> : <span className={prompt.approved ? "status-chip status-chip--active" : "status-chip"}>{prompt.approved ? "Approved" : "Paused"}</span>}</article>)}</div> : <div className="empty-state"><h2>No approved prompts yet.</h2><p>Complete onboarding to create the first controlled buyer-question baseline.</p></div>}<p className="table-caption">{demo ? "Demo review toggles are intentionally local. The demo never writes sample records to a customer workspace." : "Prompt status comes from your secured workspace. The next editing release will require a dated prompt version for every change."}</p></div>;
}
