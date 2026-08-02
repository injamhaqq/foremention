"use client";

import { useEffect, useRef, useState } from "react";
import { WORKSPACE_WEBHOOK_EVENTS } from "@/lib/workspace-webhooks";

type Endpoint = { id: string; label: string; destination_url: string; event_types: string[]; active: boolean; secret_hint: string };

export function WebhookSettings({ available, demo }: { available: boolean; demo: boolean }) {
  const [items, setItems] = useState<Endpoint[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [secret, setSecret] = useState(""); const lock = useRef(false);
  useEffect(() => { if (!demo) void fetch("/api/webhooks").then((response) => response.json()).then((result: { data?: Endpoint[] }) => setItems(result.data || [])).catch(() => undefined); }, [demo]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setMessage(""); setSecret("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: data.get("label"), url: data.get("url"), events: data.getAll("events") }) });
      const result = await response.json() as { error?: string; data?: { id: string; label: string; destinationUrl: string; eventTypes: string[]; signingSecret: string } };
      if (!response.ok || !result.data) throw new Error(result.error || "Could not create webhook.");
      setItems((current) => [{ id: result.data!.id, label: result.data!.label, destination_url: result.data!.destinationUrl, event_types: result.data!.eventTypes, active: true, secret_hint: result.data!.signingSecret.slice(-6) }, ...current]);
      setSecret(result.data.signingSecret); setMessage("Webhook created. Store the signing secret now; Foremention will not show it again."); event.currentTarget.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create webhook."); } finally { lock.current = false; setBusy(false); }
  }
  return <div className="webhook-settings"><p>Send signed, idempotent workspace events to Zapier, Make, n8n, or your own HTTPS endpoint. <a href="/api-docs/webhooks">Read the verification guide.</a></p>
    <form onSubmit={submit}><label>Name<input name="label" maxLength={80} required placeholder="Production automation" /></label><label>Public HTTPS endpoint<input name="url" type="url" required placeholder="https://hooks.example.com/foremention" /></label><fieldset><legend>Events</legend>{WORKSPACE_WEBHOOK_EVENTS.map((event) => <label key={event}><input name="events" type="checkbox" value={event} defaultChecked={event === "collection.completed"} />{event}</label>)}</fieldset><button className="button button--ink" disabled={busy || demo || !available}>{busy ? "Creating…" : "Create webhook"}</button></form>
    {message && <p className="inline-notice" role="status">{message}</p>}{secret && <div className="secret-once"><strong>Signing secret — shown once</strong><code>{secret}</code></div>}
    {items.length ? <div className="integration-list">{items.map((item) => <div key={item.id}><span><strong>{item.label}</strong></span><small>{item.destination_url} · {item.event_types.join(", ")} · secret ends {item.secret_hint}</small></div>)}</div> : <p className="table-caption">No webhook destinations configured.</p>}
  </div>;
}
