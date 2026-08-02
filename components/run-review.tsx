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
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not approve the run.");
      setMessage("Run approved. Its dated Source Map is now published inside this workspace.");
      captureProductEvent("evidence_reviewed", { review_type: "run" });
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve the run."); }
    finally { setBusy(false); }
  }
  return <div className="review-action"><div><strong>Human review gate</strong><p>Confirm the answers and cited URLs below before they become workspace evidence.</p>{message && <small role="status">{message}</small>}</div><button className="button button--ink" type="button" onClick={() => void approve()} disabled={busy}>{busy ? "Approving…" : "Approve reviewed run"}</button></div>;
}
