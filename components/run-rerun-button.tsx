"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RunRerunButton({ promptIds, provider, demo }: { promptIds: string[]; provider: string; demo: boolean }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function rerun() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ promptIds, providers: [provider] }) });
      const result = await response.json() as { id?: string; error?: string; note?: string };
      if (!response.ok) throw new Error(result.error || "Could not queue the repeated run.");
      setMessage(result.note || "Comparable run queued with the same questions and provider.");
      if (result.id && !demo) router.push(`/app/runs/${result.id}`); else router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not queue the repeated run."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="run-rerun"><button className="button button--ink" type="button" disabled={busy || !promptIds.length || !provider} onClick={() => void rerun()}>{busy ? "Queuing…" : "Run again with same evidence set"}</button>{message && <p className="inline-notice" role="status">{message}</p>}</div>;
}
