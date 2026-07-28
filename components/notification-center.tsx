"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkspaceNotification } from "@/lib/data";

export function NotificationCenter({ initialItems, demo }: { initialItems: WorkspaceNotification[]; demo: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const unread = items.filter((item) => !item.read).length;

  async function markAllRead() {
    if (demo || !unread) return;
    setBusy(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Could not update alerts.");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel panel--flush">
    <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Operational changes</span><h2>{unread} unread alert{unread === 1 ? "" : "s"}</h2></div><button className="button button--outline" type="button" disabled={demo || busy || !unread} onClick={() => void markAllRead()}>{busy ? "Updating…" : "Mark all read"}</button></div>
    {items.length ? <div className="notification-list">{items.map((item) => <article className={item.read ? "" : "is-unread"} key={item.id}><div><span>{item.kind.replaceAll("_", " ")}</span><strong>{item.title}</strong><p>{item.body}</p><small>{item.createdAt}</small></div>{item.href && <Link href={item.href}>Open →</Link>}</article>)}</div> : <div className="empty-state"><h2>No operational alerts yet.</h2><p>Run completion, failures, reviewed Source Maps, and workspace access changes will appear here from real customer events.</p></div>}
    <p className="table-caption">These are in-app alerts. Foremention does not claim application email delivery is active.</p>
  </section>;
}
