"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeletionRequest } from "@/lib/data";

export function AccountLifecycle({ initialRequest, owner, demo, organizationName }: { initialRequest: DeletionRequest | null; owner: boolean; demo: boolean; organizationName: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [exportAcknowledged, setExportAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestDeletion() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/account/deletion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
      const result = await response.json() as { error?: string; note?: string };
      if (!response.ok) throw new Error(result.error || "The deletion request could not be recorded.");
      setConfirmation(""); setMessage(result.note || "Deletion request recorded."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The deletion request could not be recorded."); }
    finally { setBusy(false); }
  }

  async function cancelDeletion() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/account/deletion", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The deletion request could not be cancelled.");
      setMessage("Deletion request cancelled. No customer data was removed."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The deletion request could not be cancelled."); }
    finally { setBusy(false); }
  }

  async function executeDeletion() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/account/deletion", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation, exportAcknowledged }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The workspace could not be deleted.");
      window.location.assign("/?account=deleted");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The workspace could not be deleted."); setBusy(false); }
  }

  if (initialRequest) {
    return <div className="deletion-request">
      <strong>Deletion request pending</strong>
      <p>Recorded {initialRequest.createdAt}; earliest permanent-deletion date {initialRequest.scheduledFor}. You can cancel during the safety window.</p>
      {initialRequest.eligibleForPermanentDeletion && <>
        <a className="button button--outline" href="/api/export/workspace">Download full workspace ZIP first</a>
        <label className="toggle"><input type="checkbox" checked={exportAcknowledged} onChange={(event) => setExportAcknowledged(event.target.checked)} /><span>I downloaded the workspace export or intentionally chose not to keep one.</span></label>
        <label>Type DELETE {organizationName}<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!owner || demo} /></label>
        <button className="danger-button" type="button" disabled={!owner || demo || busy || !exportAcknowledged || confirmation !== `DELETE ${organizationName}`} onClick={() => void executeDeletion()}>{busy ? "Deleting workspace…" : "Permanently delete workspace"}</button>
      </>}
      <button className="button button--outline" type="button" disabled={busy} onClick={() => void cancelDeletion()}>{busy ? "Cancelling…" : "Cancel request"}</button>
      {message && <p className="inline-notice" role="status">{message}</p>}
    </div>;
  }

  return <div className="deletion-request">
    <strong>Request workspace deletion</strong>
    <p>Export your full workspace ZIP first. This records a reversible request with a seven-day safety period; it does not erase data until the safety window expires and the owner confirms a second time.</p>
    <label>Type DELETE FOREMENTION<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!owner || demo} /></label>
    <button className="danger-button" type="button" disabled={!owner || demo || busy || confirmation !== "DELETE FOREMENTION"} onClick={() => void requestDeletion()}>{busy ? "Recording…" : "Record deletion request"}</button>
    {!owner && !demo && <small>Only the workspace owner can request organization deletion.</small>}
    {message && <p className="inline-notice" role="status">{message}</p>}
  </div>;
}
