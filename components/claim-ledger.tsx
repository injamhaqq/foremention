"use client";

import { useState } from "react";
import type { VerifiedClaim, WorkspaceEvidence } from "@/lib/data";

export function ClaimLedger({
  evidence,
  initialClaims,
  demo,
  canManage,
}: {
  evidence: WorkspaceEvidence[];
  initialClaims: VerifiedClaim[];
  demo: boolean;
  canManage: boolean;
}) {
  const verifiedEvidence = evidence.filter((item) => item.status === "verified");
  const [claims, setClaims] = useState(initialClaims);
  const [evidenceItemId, setEvidenceItemId] = useState(verifiedEvidence[0]?.id || "");
  const [claimText, setClaimText] = useState("");
  const [approvedWording, setApprovedWording] = useState("");
  const [limitations, setLimitations] = useState("");
  const [publicUse, setPublicUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evidenceItemId, claimText, approvedWording, limitations, publicUse }),
      });
      const result = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not approve this claim.");
      const source = verifiedEvidence.find((item) => item.id === evidenceItemId);
      setClaims((current) => [{
        id: String(result.data?.id || crypto.randomUUID()),
        evidenceItemId,
        evidenceTitle: source?.title || null,
        evidenceUrl: source?.sourceUrl || null,
        claimText,
        approvedWording,
        limitations,
        publicUse,
        verifiedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
        expiresAt: source?.expiresAt || null,
      }, ...current]);
      setClaimText("");
      setApprovedWording("");
      setLimitations("");
      setPublicUse(false);
      setMessage(demo ? "Fictional claim added to this preview." : "Claim approved with its evidence and limitations attached.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve this claim.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublicUse(claim: VerifiedClaim) {
    setUpdating(claim.id);
    setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: claim.id, publicUse: !claim.publicUse }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update this claim.");
      setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, publicUse: !item.publicUse } : item));
      setMessage(claim.publicUse ? "Public use removed. The claim remains in the internal ledger." : "Claim approved for public use with its evidence trail attached.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this claim.");
    } finally {
      setUpdating("");
    }
  }

  return <section className="panel panel--flush claim-ledger">
    <div className="claim-ledger__heading">
      <div><span className="eyebrow">Claim Integrity Ledger</span><h2>Say only what the evidence supports.</h2></div>
      <p>Connect an observed or proposed claim to verified proof, approved wording, and explicit limitations. This does not decide whether an AI answer is accurate automatically.</p>
    </div>
    {verifiedEvidence.length > 0 && canManage ? <form className="claim-create" onSubmit={submit}>
      <label>Verified evidence<select value={evidenceItemId} onChange={(event) => setEvidenceItemId(event.target.value)} required>{verifiedEvidence.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <label>Observed or proposed claim<textarea value={claimText} onChange={(event) => setClaimText(event.target.value)} required minLength={8} rows={3} /></label>
      <label>Approved wording<textarea value={approvedWording} onChange={(event) => setApprovedWording(event.target.value)} required minLength={8} rows={3} /></label>
      <label>Limitations<textarea value={limitations} onChange={(event) => setLimitations(event.target.value)} required minLength={3} rows={3} /></label>
      <label className="claim-public-toggle"><input type="checkbox" checked={publicUse} onChange={(event) => setPublicUse(event.target.checked)} /> Approved for public use</label>
      <button className="button button--ink" disabled={busy} type="submit">{busy ? "Approving…" : "Approve claim"}</button>
    </form> : <div className="claim-ledger__gate"><strong>{demo ? "Fictional preview" : "Verified evidence required"}</strong><p>{demo ? "The record below demonstrates the workflow without representing a real company." : "Verify an evidence item above before approving claim wording."}</p></div>}
    {message && <p className="inline-notice" role="status">{message}</p>}
    {claims.length > 0 ? <div className="claim-list">{claims.map((claim) => <article key={claim.id}>
      <div className="claim-list__status"><span className={`status-chip ${claim.publicUse ? "status-chip--active" : ""}`}>{claim.publicUse ? "public use approved" : "internal only"}</span><small>{claim.verifiedAt || "Review date unavailable"}</small></div>
      <div><span>Claim under review</span><p>{claim.claimText}</p></div>
      <div><span>Approved wording</span><strong>{claim.approvedWording}</strong></div>
      <div><span>Evidence and limitations</span><p>{claim.limitations || "No limitation recorded."}</p>{claim.evidenceUrl ? <a href={claim.evidenceUrl} target="_blank" rel="noreferrer">{claim.evidenceTitle || "Open evidence"} ↗</a> : <small>{claim.evidenceTitle || "Evidence link unavailable"}</small>}</div>
      <button type="button" disabled={!canManage || updating === claim.id || demo} onClick={() => void togglePublicUse(claim)}>{updating === claim.id ? "Updating…" : claim.publicUse ? "Return to internal use" : "Approve public use"}</button>
    </article>)}</div> : <div className="empty-state empty-state--compact"><h2>No approved claims yet.</h2><p>The ledger stays empty until a team member ties wording and limitations to verified evidence.</p></div>}
  </section>;
}
