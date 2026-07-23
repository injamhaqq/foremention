"use client";

import { useMemo, useState } from "react";

const initialPrompts = [
  { id: 1, cluster: "Discovery", text: "Best HR software for distributed teams", approved: true },
  { id: 2, cluster: "Use case", text: "What HR platform works for a 200-person remote company?", approved: true },
  { id: 3, cluster: "Comparison", text: "Northstar HR vs Deel for a global team", approved: false },
  { id: 4, cluster: "Alternative", text: "Best alternatives to Rippling for distributed companies", approved: true },
  { id: 5, cluster: "Trust", text: "Most reliable HRIS for cross-border compliance", approved: false },
  { id: 6, cluster: "Constraint", text: "Affordable HR platform for a remote startup", approved: true },
];

export function PromptLibrary() {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => prompts.filter((prompt) => filter === "All" || prompt.cluster === filter), [prompts, filter]);
  return <div><div className="prompt-tools"><label>Cluster<select value={filter} onChange={(event) => setFilter(event.target.value)}>{["All","Discovery","Use case","Comparison","Alternative","Trust","Constraint"].map(value => <option key={value}>{value}</option>)}</select></label><span>{prompts.filter(prompt => prompt.approved).length} of {prompts.length} approved</span></div><div className="prompt-list">{visible.map(prompt => <article key={prompt.id}><div><span>{prompt.cluster}</span><strong>{prompt.text}</strong></div><button className={prompt.approved ? "is-approved" : ""} type="button" aria-pressed={prompt.approved} onClick={() => setPrompts(current => current.map(item => item.id === prompt.id ? {...item, approved: !item.approved} : item))}>{prompt.approved ? "Approved" : "Needs review"}</button></article>)}</div><p className="table-caption">Review toggles are local to this screen. The guided onboarding flow writes the approved baseline as one secured transaction.</p></div>;
}
