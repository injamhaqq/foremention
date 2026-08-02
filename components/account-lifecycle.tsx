"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeletionRequest } from "@/lib/data";

export function AccountLifecycle({ initialRequest, owner, demo }: { initialRequest: DeletionRequest | null; owner: boolean; demo: boolean }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestDeletion() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json() as { error?: string; note?: string };
      if (!response.ok) throw new Error(result.error || "The deletion request could not be recorded.");
      setConfirmation("");
      setMessage(result.note || "Deletion request recorded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The deletion request could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/deletion", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The deletion request could not be cancelled.");
      setMessage("Deletion request cancelled. No customer data was removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The deletion request could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  if (initialRequest) return <div className="deletion-request">
    <strong>Deletion request pending</strong>
    <p>Recorded {initialRequest.createdAt}; earliest scheduled date {initialRequest.scheduledFor}. Execution is not active until the retention and deletion worker passes production testing.</p>
    <button className="button button--outline" type="button" disabled={busy} onClick={() => void cancelDeletion()}>{busy ? "Cancelling…" : "Cancel request"}</button>
    {message && <p className="inline-notice" role="status">{message}</p>}
  </div>;

  return <div className="deletion-request">
    <strong>Request account and workspace deletion</strong>
    <p>Export your full workspace ZIP first. This records a reversible request with a seven-day safety period; it does not erase data until the deletion worker is separately verified.</p>
    <label>Type DELETE FOREMENTION<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!owner || demo} /></label>
    <button className="danger-button" type="button" disabled={!owner || demo || busy || confirmation !== "DELETE FOREMENTION"} onClick={() => void requestDeletion()}>{busy ? "Recording…" : "Record deletion request"}</button>
    {!owner && !demo && <small>Only the workspace owner can request organization deletion.</small>}
    {message && <p className="inline-notice" role="status">{message}</p>}
  </div>;
}
