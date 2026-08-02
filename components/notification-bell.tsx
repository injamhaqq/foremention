"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkspaceNotification } from "@/lib/data";

export function NotificationBell({ initialItems }: { initialItems: WorkspaceNotification[] }) {
  const [items, setItems] = useState(initialItems);
  const unread = items.filter((item) => !item.read).length;

  async function markRead(item: WorkspaceNotification) {
    if (item.read) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    }).catch(() => undefined);
  }

  return <details className="notification-bell">
    <summary aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
      <span aria-hidden="true">&#128276;</span>
      {unread > 0 && <strong>{unread > 99 ? "99+" : unread}</strong>}
    </summary>
    <div className="notification-bell__panel">
      <div><span>Notifications</span><Link href="/app/alerts">View all</Link></div>
      {items.length ? items.slice(0, 5).map((item) => <Link
        className={item.read ? "" : "is-unread"}
        href={item.href || "/app/alerts"}
        key={item.id}
        onClick={() => void markRead(item)}
      >
        <strong>{item.title}</strong>
        <small>{item.createdAt}</small>
      </Link>) : <p>No workspace events yet.</p>}
    </div>
  </details>;
}
