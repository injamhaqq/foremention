"use client";

import { useRef, useState } from "react";
import type { VerifiedClaim, WorkspaceEvidence } from "@/lib/data";

export function ClaimLedger({ evidence, initialClaims, demo, canManage }: {
  evidence: WorkspaceEvidence[];
  initialClaims: VerifiedClaim[];
  demo: boolean;
  canManage: boolean;
}) {
  const verifiedEvidence = evidence.filter((item) => item.status === "verified");
  const [claims, setClaims] = useState(initialClaims);
  const [evidenceItemIds, setEvidenceItemIds] = useState<string[]>(verifiedEvidence[0]?.id ? [verifiedEvidence[0].id] : []);
  const [claimText, setClaimText] = useState("");
  const [approvedWording, setApprovedWording] = useState("");
  const [limitations, setLimitations] = useState("");
  const [publicUse, setPublicUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [updating, setUpdating] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, VerifiedClaim["verificationStatus"]>>(() => Object.fromEntries(initialClaims.map((claim) => [claim.id, claim.verificationStatus])));
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initialClaims.map((claim) => [claim.id, claim.verificationNote || ""])));
  const [message, setMessage] = useState("");
  const submissionLock = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ evidenceItemIds, claimText, approvedWording, limitations, publicUse }),
      });
      const result = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not approve this claim.");
      const selected = verifiedEvidence.filter((item) => evidenceItemIds.includes(item.id));
      const source = selected[0];
      setClaims((current) => [{
        id: String(result.data?.id || crypto.randomUUID()), evidenceItemId: source?.id || null,
        evidenceTitle: source?.title || null, evidenceUrl: source?.sourceUrl || null,
        evidenceItems: selected.map((item) => ({ id: item.id, title: item.title, url: item.sourceUrl })),
        claimText, approvedWording, limitations, publicUse: false, verificationStatus: "pending", verificationNote: null,
        verifiedAt: null,
        expiresAt: source?.expiresAt || null,
      }, ...current]);
      setClaimText(""); setApprovedWording(""); setLimitations(""); setPublicUse(false);
      setMessage(demo ? "Fictional claim added to this preview." : "Claim approved with every evidence link and limitation attached.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve this claim."); }
    finally { submissionLock.current = false; setBusy(false); }
  }

  function toggleEvidence(id: string) {
    setEvidenceItemIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 10));
  }

  async function draftClaim() {
    if (!evidenceItemIds.length) return setMessage("Select at least one verified evidence item.");
    setDrafting(true); setMessage("");
    try {
      const response = await fetch("/api/claims", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ evidenceItemIds }) });
      const result = await response.json() as { data?: { claimText: string; approvedWording: string; limitations: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Could not draft a claim.");
      setClaimText(result.data.claimText); setApprovedWording(result.data.approvedWording); setLimitations(result.data.limitations);
      setMessage("Evidence-bound draft created. Review the wording before saving it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not draft a claim."); }
    finally { setDrafting(false); }
  }

  async function togglePublicUse(claim: VerifiedClaim) {
    setUpdating(claim.id); setMessage("");
    try {
      const response = await fetch("/api/claims", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: claim.id, publicUse: !claim.publicUse }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update this claim.");
      setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, publicUse: !item.publicUse } : item));
      setMessage(claim.publicUse ? "Public use removed. The claim remains in the internal ledger." : "Claim approved for public use with its evidence trail attached.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update this claim."); }
    finally { setUpdating(""); }
  }

  async function updateVerification(claim: VerifiedClaim) {
    const verificationStatus = statusDrafts[claim.id] || claim.verificationStatus;
    const verificationNote = noteDrafts[claim.id] || "";
    setUpdating(claim.id); setMessage("");
    try {
      const response = await fetch("/api/claims", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: claim.id, verificationStatus, verificationNote }) });
      const result = await response.json() as { data?: { publicUse?: boolean }; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update claim verification.");
      setClaims((current) => current.map((item) => item.id === claim.id ? { ...item, verificationStatus, verificationNote: verificationNote || null, publicUse: result.data?.publicUse ?? item.publicUse, verifiedAt: verificationStatus === "verified" ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null } : item));
      setMessage(`Claim marked ${verificationStatus}. The decision and note are retained in the audit trail.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update claim verification."); }
    finally { setUpdating(""); }
  }

  return <section className="panel panel--flush claim-ledger">
    <div className="claim-ledger__heading"><div><span className="eyebrow">Claim Integrity Ledger</span><h2>Say only what the evidence supports.</h2></div><p>Select verified proof, draft conservative wording, and keep explicit limitations. Foremention never treats a draft as automatically true.</p></div>
    {verifiedEvidence.length > 0 && canManage ? <form className="claim-create" onSubmit={submit} aria-busy={busy}>
      <fieldset><legend>Verified evidence</legend>{verifiedEvidence.map((item) => <label className="claim-evidence-choice" key={item.id}><input type="checkbox" checked={evidenceItemIds.includes(item.id)} onChange={() => toggleEvidence(item.id)} /> <span>{item.title}</span></label>)}</fieldset>
      <button className="button button--quiet" type="button" disabled={drafting || !evidenceItemIds.length} onClick={() => void draftClaim()}>{drafting ? "Drafting…" : "Draft from selected evidence"}</button>
      <label>Observed or proposed claim<textarea value={claimText} onChange={(event) => setClaimText(event.target.value)} required minLength={8} rows={3} /></label>
      <label>Approved wording<textarea value={approvedWording} onChange={(event) => setApprovedWording(event.target.value)} required minLength={8} rows={3} /></label>
      <label>Limitations<textarea value={limitations} onChange={(event) => setLimitations(event.target.value)} required minLength={3} rows={3} /></label>
      <label className="claim-public-toggle"><input type="checkbox" checked={publicUse} onChange={(event) => setPublicUse(event.target.checked)} /> Approved for public use</label>
      <button className="button button--ink" disabled={busy || !evidenceItemIds.length} type="submit">{busy ? "Approving…" : "Approve claim"}</button>
    </form> : <div className="claim-ledger__gate"><strong>{demo ? "Fictional preview" : "Verified evidence required"}</strong><p>{demo ? "The record below demonstrates the workflow without representing a real company." : "Verify an evidence item above before drafting claim wording."}</p></div>}
    {message && <p className="inline-notice" role="status">{message}</p>}
    {claims.length > 0 ? <div className="claim-list">{claims.map((claim) => <article key={claim.id}>
      <div className="claim-list__status"><span className={`status-chip ${claim.verificationStatus === "verified" ? "status-chip--active" : ""}`}>{claim.verificationStatus}</span><small>{claim.verifiedAt || "Not verified"}</small></div>
      <div><span>Claim under review</span><p>{claim.claimText}</p></div>
      <div><span>Approved wording</span><strong>{claim.approvedWording}</strong></div>
      <div><span>Evidence and limitations</span><p>{claim.limitations || "No limitation recorded."}</p>{claim.evidenceItems?.length ? <ul>{claim.evidenceItems.map((item) => <li key={item.id}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</li>)}</ul> : claim.evidenceUrl ? <a href={claim.evidenceUrl} target="_blank" rel="noreferrer">{claim.evidenceTitle || "Open evidence"} ↗</a> : <small>{claim.evidenceTitle || "Evidence link unavailable"}</small>}</div>
      <div className="claim-verification"><label>Verification status<select value={statusDrafts[claim.id] || claim.verificationStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [claim.id]: event.target.value as VerifiedClaim["verificationStatus"] }))}><option value="pending">Pending</option><option value="verified">Verified</option><option value="disputed">Disputed</option></select></label><label>Review note<textarea rows={2} value={noteDrafts[claim.id] ?? claim.verificationNote ?? ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [claim.id]: event.target.value }))} /></label><button type="button" disabled={!canManage || updating === claim.id || demo} onClick={() => void updateVerification(claim)}>{updating === claim.id ? "Updating…" : "Save verification"}</button></div>
      <button type="button" disabled={!canManage || updating === claim.id || demo || claim.verificationStatus !== "verified"} onClick={() => void togglePublicUse(claim)}>{updating === claim.id ? "Updating…" : claim.publicUse ? "Return to internal use" : "Approve public use"}</button>
    </article>)}</div> : <div className="empty-state empty-state--compact"><h2>No approved claims yet.</h2><p>The ledger stays empty until a team member ties wording and limitations to verified evidence.</p></div>}
  </section>;
}
