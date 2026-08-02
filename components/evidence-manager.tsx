"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceEvidence } from "@/lib/data";
import { CommentThread } from "@/components/comment-thread";

export function EvidenceManager({ initialItems, demo, canReview }: { initialItems: WorkspaceEvidence[]; demo: boolean; canReview: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [type, setType] = useState("Company fact");
  const [rights, setRights] = useState("Customer-provided for internal product use");
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState("");
  const [message, setMessage] = useState("");
  const submissionLock = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, sourceUrl, type, rights }) });
      const result = (await response.json()) as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save evidence.");
      const item: WorkspaceEvidence = { id: String(result.data?.id || crypto.randomUUID()), title, type, sourceUrl: sourceUrl || null, rights, status: "unverified", verifiedAt: null, expiresAt: null };
      setItems((current) => [item, ...current]); setTitle(""); setSourceUrl("");
      setMessage(demo ? "Demo evidence added locally." : "Evidence saved as unverified. Verify it before public use.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save evidence."); }
    finally { submissionLock.current = false; setBusy(false); }
  }

  async function review(item: WorkspaceEvidence, status: "verified" | "unverified") {
    setReviewing(item.id); setMessage("");
    try {
      const response = await fetch("/api/evidence", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      const result = await response.json() as { data?: { verifiedAt?: string | null }; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update evidence review.");
      setItems((current) => current.map((entry) => entry.id === item.id ? {
        ...entry,
        status,
        verifiedAt: status === "verified" ? new Date(result.data?.verifiedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null,
      } : entry));
      setMessage(status === "verified" ? "Evidence verified. Its source and usage rights remain attached to the record." : "Evidence returned to review and excluded from verified claims.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update evidence review.");
    } finally {
      setReviewing("");
    }
  }

  return <div>
    <form className="evidence-create" onSubmit={submit} aria-busy={busy}>
      <div><span className="eyebrow">Evidence intake</span><h2>Add the proof before using the claim.</h2></div>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option>Company fact</option><option>Customer result</option><option>Security</option><option>Integration</option><option>Pricing</option><option>Research</option></select></label>
      <label>Evidence title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label>Supporting URL<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
      <label>Usage rights<input value={rights} onChange={(event) => setRights(event.target.value)} /></label>
      <button className="button button--ink" type="submit" disabled={busy}>{busy ? "Saving…" : "Save evidence"}</button>
    </form>
    {message && <p className="inline-notice" role="status">{message}</p>}
    {items.length ? <div className="evidence-table"><div className="evidence-row evidence-row--head"><span>Evidence</span><span>Source / rights</span><span>Status</span><span>Verified</span><span>Review</span></div>{items.map((item) => {
      const reviewReady = Boolean(item.sourceUrl && item.rights?.trim());
      return <div className="evidence-row" key={item.id}><div><strong>{item.title}</strong><small>{item.type}</small><CommentThread entityType="evidence_item" entityId={item.id} demo={demo} /></div><div>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a> : <span>No URL supplied</span>}<small>{item.rights || "Rights not recorded"}</small></div><span className={`status-chip status-chip--${item.status === "verified" ? "active" : ""}`}>{item.status}</span><span>{item.verifiedAt || "Not verified"}</span><button className="evidence-review-button" type="button" disabled={!canReview || reviewing === item.id || (item.status !== "verified" && !reviewReady)} title={!reviewReady && item.status !== "verified" ? "Add a source URL and usage rights first." : undefined} onClick={() => void review(item, item.status === "verified" ? "unverified" : "verified")}>{reviewing === item.id ? "Updating…" : item.status === "verified" ? "Reopen review" : "Verify evidence"}</button></div>;
    })}</div> : <div className="empty-state"><h2>No workspace evidence yet.</h2><p>Add the first dated proof above. Unverified items never become public claims automatically.</p></div>}
  </div>;
}
