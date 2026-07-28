"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunCancel({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not cancel the collection.");
      setMessage("Collection cancelled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel the collection.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="review-action">
    <div><strong>Collection control</strong><p>Cancel stops future provider work at the next safe checkpoint.</p>{message && <small role="status">{message}</small>}</div>
    <button className="button button--outline" type="button" onClick={() => void cancel()} disabled={busy}>{busy ? "Cancelling…" : "Cancel run"}</button>
  </div>;
}
