"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspacePrompt } from "@/lib/data";

type SuggestedQuestion = { cluster: string; text: string; why: string };

export function PromptLibrary({ initialPrompts, demo, company, category }: { initialPrompts: WorkspacePrompt[]; demo: boolean; company: string; category: string }) {
  const router = useRouter();
  const [prompts, setPrompts] = useState(initialPrompts);
  const [filter, setFilter] = useState("All");
  const [text, setText] = useState("");
  const [cluster, setCluster] = useState("Discovery");
  const [busy, setBusy] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [message, setMessage] = useState("");
  const visible = useMemo(() => prompts.filter((prompt) => filter === "All" || prompt.cluster === filter), [prompts, filter]);
  const clusters = ["All", ...Array.from(new Set(prompts.map((prompt) => prompt.cluster)))];
  const suggestions = useMemo<SuggestedQuestion[]>(() => [
    { cluster: "Discovery", text: `Which ${category} platforms are best for a growing B2B team?`, why: "Measures unaided category discovery." },
    { cluster: "Comparison", text: `How does ${company} compare with other ${category} platforms?`, why: "Tests direct competitive framing." },
    { cluster: "Alternative", text: `What are the best alternatives to ${company} for ${category}?`, why: "Surfaces replacement and shortlist language." },
    { cluster: "Use case", text: `Which ${category} platform is best for a lean team that needs to scale?`, why: "Adds a concrete operating context." },
    { cluster: "Trust", text: `Which ${category} providers have the strongest evidence for reliability and security?`, why: "Tests proof-sensitive recommendations." },
    { cluster: "Constraint", text: `Which ${category} tools offer strong value for a budget-conscious team?`, why: "Measures price and constraint-led discovery." },
  ], [category, company]);

  function fillSuggestion(suggestion: SuggestedQuestion) {
    setCluster(suggestion.cluster);
    setText(suggestion.text);
    document.getElementById("buyer-question-input")?.focus();
  }

  async function addPrompt(event: React.FormEvent) {
    event.preventDefault();
    setBusy("new"); setMessage("");
    try {
      const response = await fetch("/api/prompts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, cluster }) });
      const result = (await response.json()) as { data?: WorkspacePrompt; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Could not add the question.");
      setPrompts((current) => [...current, result.data!]);
      setText("");
      setMessage(demo ? "Demo question added locally. Customer data was not written." : "Buyer question added to the approved baseline.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add the question."); }
    finally { setBusy(""); }
  }

  async function toggle(prompt: WorkspacePrompt) {
    setBusy(prompt.id); setMessage("");
    const next = !prompt.approved;
    if (demo) {
      setPrompts((current) => current.map((item) => item.id === prompt.id ? { ...item, approved: next } : item));
      setBusy(""); return;
    }
    try {
      const response = await fetch("/api/prompts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: prompt.id, active: next }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update the question.");
      setPrompts((current) => current.map((item) => item.id === prompt.id ? { ...item, approved: next } : item));
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update the question."); }
    finally { setBusy(""); }
  }

  async function saveEdit(prompt: WorkspacePrompt) {
    const nextText = editingText.trim();
    if (nextText.length < 10) {
      setMessage("Write a specific buyer question with at least 10 characters.");
      return;
    }
    setBusy(prompt.id); setMessage("");
    if (demo) {
      setPrompts((current) => current.map((item) => item.id === prompt.id ? { ...item, text: nextText } : item));
      setEditingId(""); setEditingText(""); setBusy("");
      return;
    }
    try {
      const response = await fetch("/api/prompts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: prompt.id, text: nextText }),
      });
      const result = (await response.json()) as { data?: { text: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Could not update the question.");
      setPrompts((current) => current.map((item) => item.id === prompt.id ? { ...item, text: result.data!.text } : item));
      setEditingId(""); setEditingText("");
      setMessage("Buyer question updated. Existing run snapshots remain unchanged.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the question.");
    } finally {
      setBusy("");
    }
  }

  return <div>
    <section className="question-planner" aria-labelledby="question-planner-title">
      <div className="question-planner__intro"><span className="eyebrow">Question planner</span><h2 id="question-planner-title">Cover the buyer journey, not random prompts.</h2><p>These are editable starting points based on your category—not search-volume claims or collected evidence. Use only the questions a real buyer would ask.</p></div>
      <div className="question-planner__grid">{suggestions.map((suggestion) => <article key={suggestion.cluster}>
        <span>{suggestion.cluster}</span>
        <strong>{suggestion.text}</strong>
        <p>{suggestion.why}</p>
        <button type="button" onClick={() => fillSuggestion(suggestion)}>Use this question &rarr;</button>
      </article>)}</div>
    </section>
    <form className="prompt-create" onSubmit={addPrompt}>
      <div><span className="eyebrow">Add buyer question</span><h2>Use the language a real buyer would type.</h2></div>
      <label>Intent<select value={cluster} onChange={(event) => setCluster(event.target.value)}><option>Discovery</option><option>Comparison</option><option>Alternative</option><option>Use case</option><option>Trust</option><option>Constraint</option></select></label>
      <label>Question<input id="buyer-question-input" value={text} onChange={(event) => setText(event.target.value)} minLength={10} maxLength={1000} placeholder="What is the best…?" required /></label>
      <button className="button button--ink" type="submit" disabled={busy === "new"}>{busy === "new" ? "Adding…" : "Add question"}</button>
    </form>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="prompt-tools"><label>Cluster<select value={filter} onChange={(event) => setFilter(event.target.value)}>{clusters.map((value) => <option key={value}>{value}</option>)}</select></label><span>{prompts.filter((prompt) => prompt.approved).length} of {prompts.length} active</span></div>
    {visible.length ? <div className="prompt-list">{visible.map((prompt) => <article key={prompt.id}>
      <div>
        <span>{prompt.cluster}</span>
        {editingId === prompt.id
          ? <input value={editingText} onChange={(event) => setEditingText(event.target.value)} minLength={10} maxLength={1000} aria-label="Edit buyer question" />
          : <strong>{prompt.text}</strong>}
      </div>
      <div className="prompt-row-actions">
        {editingId === prompt.id
          ? <>
            <button type="button" disabled={busy === prompt.id} onClick={() => void saveEdit(prompt)}>{busy === prompt.id ? "Saving…" : "Save"}</button>
            <button type="button" disabled={busy === prompt.id} onClick={() => { setEditingId(""); setEditingText(""); }}>Cancel</button>
          </>
          : <button type="button" onClick={() => { setEditingId(prompt.id); setEditingText(prompt.text); }}>Edit</button>}
        <button className={prompt.approved ? "is-approved" : ""} type="button" aria-pressed={prompt.approved} disabled={busy === prompt.id} onClick={() => void toggle(prompt)}>{busy === prompt.id ? "Saving…" : prompt.approved ? "Active" : "Paused"}</button>
      </div>
    </article>)}</div> : <div className="empty-state"><h2>No buyer questions yet.</h2><p>Add the first controlled question above or complete guided onboarding.</p></div>}
    <p className="table-caption">{demo ? "Demo changes stay in this preview and never enter a customer workspace." : "Every collection uses only the active questions shown here. Pause a question to remove it from future runs without deleting history."}</p>
  </div>;
}
