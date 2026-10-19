"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// One run-creation path: both "Run again" (finalized records) and "Retry" (failed
// records) POST to /api/runs, which re-applies origin, auth, role, plan-limit,
// active-duplicate, spending-ceiling and evidence-capacity checks server-side.
export function RunRerunButton({ promptIds, provider, demo, mode = "rerun" }: { promptIds: string[]; provider: string; demo: boolean; mode?: "rerun" | "retry" }) {
  const retry = mode === "retry";
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
      if (!response.ok) throw new Error(result.error || (retry ? "Could not queue the retry." : "Could not queue the repeated run."));
      setMessage(result.note || (retry ? "Retry queued with the same questions and provider. The failed record stays unchanged in your history." : "Repeat collection queued with the same questions and provider. Foremention will compare it only if the exact question text, provider, model, and methodology are compatible."));
      if (result.id && !demo) router.push(`/app/runs/${result.id}`); else router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : retry ? "Could not queue the retry." : "Could not queue the repeated run."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className={retry ? "run-rerun run-rerun--retry" : "run-rerun"}><button className="button button--ink" type="button" disabled={busy || !promptIds.length || !provider} onClick={() => void rerun()}>{busy ? "Queuing…" : retry ? "Retry this collection" : "Run again with same questions and provider"}</button>{message && <p className="inline-notice" role="status">{message}</p>}</div>;
}
