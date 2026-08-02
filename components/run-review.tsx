"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureProductEvent } from "@/lib/product-analytics";

export function RunReview({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function approve() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/runs/${runId}/review`, { method: "POST" });
      const responseText = await response.text();
      let result: { error?: string } = {};
      if (responseText.trim()) {
        try { result = JSON.parse(responseText) as { error?: string }; }
        catch { /* The status-aware message below is safer than exposing an upstream HTML response. */ }
      }
      if (!response.ok) {
        throw new Error(result.error || `The review could not be completed (status ${response.status}). Refresh the run before retrying.`);
      }
      setMessage("Run approved. Its dated Source Map is now published inside this workspace.");
      captureProductEvent("evidence_reviewed", { review_type: "run" });
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve the run."); }
    finally { setBusy(false); }
  }
  return <div className="review-action"><div><strong>Human review gate</strong><p>Confirm the answers and cited URLs below before they become workspace evidence.</p>{message && <small role="status">{message}</small>}</div><button className="button button--ink" type="button" onClick={() => void approve()} disabled={busy}>{busy ? "Approving…" : "Approve reviewed run"}</button></div>;
}
