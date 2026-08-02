"use client";

import { useRef, useState } from "react";

type Comment = { id: string; body: string; author: string; createdAt: string; own: boolean };
type EntityType = "source_map_entry" | "priority_gap" | "evidence_item";

export function CommentThread({ entityType, entityId, demo }: { entityType: EntityType; entityId: string; demo: boolean }) {
  const [items, setItems] = useState<Comment[]>([]); const [loaded, setLoaded] = useState(false); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const lock = useRef(false);
  const query = `entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
  async function load() { if (loaded || loading) return; setLoading(true); try { const response = await fetch(`/api/comments?${query}`); const result = await response.json() as { data?: Comment[] }; if (response.ok) setItems(result.data || []); setLoaded(true); } finally { setLoading(false); } }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (lock.current) return; const form = event.currentTarget; const data = new FormData(form); const body = String(data.get("comment") || "").trim(); if (!body) return; lock.current = true; setBusy(true); setMessage(""); try { const response = await fetch(`/api/comments?${query}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) }); const result = await response.json() as { data?: Comment; error?: string }; if (!response.ok || !result.data) throw new Error(result.error || "Could not post comment."); setItems((current) => [...current, result.data!]); form.reset(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not post comment."); } finally { lock.current = false; setBusy(false); } }
  return <details className="comment-thread" onToggle={(event) => { if (event.currentTarget.open) void load(); }}><summary>Comments{loaded && items.length ? ` (${items.length})` : ""}</summary><div>{loading ? <p>Loading comments…</p> : items.length ? items.map((item) => <article key={item.id}><strong>{item.author}</strong><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></article>) : <p>No comments yet.</p>}<form onSubmit={submit}><label><span className="sr-only">Comment</span><textarea name="comment" maxLength={2000} required placeholder="Add a workspace comment…" /></label><button type="submit" disabled={busy}>{busy ? "Posting…" : "Post comment"}</button></form>{message && <p role="status">{message}</p>}{demo && <small>Comments in the fictional demo are not persisted.</small>}</div></details>;
}
