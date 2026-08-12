"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkspaceNotification } from "@/lib/data";

function alertMeaning(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("error")) return { severity: "Needs attention", why: "Part of the monitoring or evidence workflow did not finish. Saved results remain separate from the failed step.", action: "Inspect and recover" };
  if (normalized.includes("review")) return { severity: "Review", why: "A human decision is needed before this evidence should influence an opportunity or customer-facing analytics.", action: "Review evidence" };
  if (normalized.includes("source") || normalized.includes("map")) return { severity: "Evidence", why: "The set of pages linked to your AI observations changed or became ready to inspect.", action: "Inspect sources" };
  if (normalized.includes("run") || normalized.includes("collection")) return { severity: "Collection", why: "New AI observations may now be available, or a collection state changed.", action: "Open AI Results" };
  if (normalized.includes("team") || normalized.includes("invite") || normalized.includes("access")) return { severity: "Workspace", why: "Workspace access or collaboration changed and may affect who can view or modify evidence.", action: "Inspect workspace" };
  return { severity: "Update", why: "A recorded workspace event changed. Open the linked record for the exact evidence and state.", action: "Open record" };
}

export function NotificationCenter({ initialItems, demo }: { initialItems: WorkspaceNotification[]; demo: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const unread = items.filter((item) => !item.read).length;

  async function markAllRead() {
    if (demo || !unread) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Could not update alerts.");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setMessage("All alerts marked as read.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update alerts.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel panel--flush">
    <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">What changed?</span><h2>{unread ? `${unread} unread alert group${unread === 1 ? "" : "s"}` : "You're caught up"}</h2><p>Alerts explain a recorded change, why it matters, and the next place to inspect. They are not urgency scores or predictions.</p></div><button className="button button--outline" type="button" disabled={demo || busy || !unread} onClick={() => void markAllRead()}>{busy ? "Updating…" : "Mark all read"}</button></div>
    {message && <p className="inline-notice" role="status">{message}</p>}
    {items.length ? <div className="notification-list">{items.map((item) => { const meaning = alertMeaning(item.kind); return <article className={item.read ? "" : "is-unread"} key={item.id}><div><span>{meaning.severity} · {item.kind.replaceAll("_", " ")}{item.count > 1 ? ` · ${item.count} similar events` : ""}</span><strong>{item.title}</strong><p><b>What changed:</b> {item.body}</p><p><b>Why it matters:</b> {meaning.why}</p><small>Most recent recorded event: {item.createdAt}</small></div>{item.href ? <Link href={item.href}>{meaning.action} →</Link> : <span aria-hidden="true" />}</article>; })}</div> : <div className="empty-state"><h2>No alerts need your attention.</h2><p>Collection completion, failures, source review changes, and workspace access events will appear here only when Foremention records a real event.</p><Link className="button button--ink" href="/app/runs">Open AI Results →</Link></div>}
    <p className="table-caption">These are in-app alerts. Foremention does not claim application email delivery is active.</p>
  </section>;
}
