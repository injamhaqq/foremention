"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChangeSpecificationStatus = "draft" | "in_review" | "approved" | "in_execution" | "completed" | "rejected";
type ChangeSpecificationRecord = {
  id: string;
  opportunityId: string;
  baselineRunId: string | null;
  controlClass: "CONTROLLABLE" | "INFLUENCEABLE" | "UNCONTROLLABLE" | null;
  controlSurface: string | null;
  eligibilityState: "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "STRUCTURALLY_INELIGIBLE" | "UNKNOWN";
  decisionState: "DO_NOW" | "TEST_FIRST" | "DO_NOT_DO" | "MONITOR_ONLY" | "INSUFFICIENT_EVIDENCE";
  truthState: "OBSERVED_FACT" | "LIKELY_EXPLANATION" | "HYPOTHESIS" | "RECOMMENDED_EXPERIMENT" | "VERIFIED_OUTCOME";
  confidenceState: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  title: string;
  problemStatement: string;
  exactChange: string | null;
  ownerRole: string | null;
  priorityRank: number | null;
  effort: "LOW" | "MEDIUM" | "HIGH" | null;
  acceptanceCriteria: string[];
  verificationPlan: Record<string, unknown>;
  status: ChangeSpecificationStatus;
  linkedEvidenceCount: number;
  submittedAt: string | null;
  decisionAt: string | null;
  approvalNote: string | null;
};

type Draft = {
  title: string;
  problemStatement: string;
  exactChange: string;
  controlClass: "" | "CONTROLLABLE" | "INFLUENCEABLE" | "UNCONTROLLABLE";
  controlSurface: string;
  eligibilityState: ChangeSpecificationRecord["eligibilityState"];
  decisionState: ChangeSpecificationRecord["decisionState"];
  truthState: ChangeSpecificationRecord["truthState"];
  confidenceState: ChangeSpecificationRecord["confidenceState"];
  ownerRole: string;
  priorityRank: string;
  effort: "" | "LOW" | "MEDIUM" | "HIGH";
  acceptanceCriteria: string;
  verificationIntent: string;
};

const readable = (value: string) => value.replaceAll("_", " ").toLowerCase();

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error("The server returned an unreadable response."); }
}

const draftFrom = (record: ChangeSpecificationRecord): Draft => ({
  title: record.title,
  problemStatement: record.problemStatement,
  exactChange: record.exactChange || "",
  controlClass: record.controlClass || "",
  controlSurface: record.controlSurface || "",
  eligibilityState: record.eligibilityState,
  decisionState: record.decisionState,
  truthState: record.truthState,
  confidenceState: record.confidenceState,
  ownerRole: record.ownerRole || "",
  priorityRank: record.priorityRank ? String(record.priorityRank) : "",
  effort: record.effort || "",
  acceptanceCriteria: record.acceptanceCriteria.join("\n"),
  verificationIntent: typeof record.verificationPlan.intent === "string" ? record.verificationPlan.intent : "",
});

async function loadChangeSpecification(id: string) {
  const response = await fetch("/api/change-specifications", { headers: { accept: "application/json" } });
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Change Specifications could not be loaded.");
  const rows = Array.isArray(payload.data) ? payload.data as ChangeSpecificationRecord[] : [];
  const found = rows.find((item) => item.id === id) || null;
  if (!found) throw new Error("Change Specification not found in this workspace.");
  return found;
}

export function ChangeSpecificationDetail({ id, demo = false, role = "viewer" }: { id: string; demo?: boolean; role?: "owner" | "admin" | "analyst" | "viewer" }) {
  const [record, setRecord] = useState<ChangeSpecificationRecord | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const writing = useRef(false);
  const activeId = useRef(id);
  useEffect(() => { activeId.current = id; return () => { activeId.current = ""; }; }, [id]);
  const writable = !demo && (role === "owner" || role === "admin" || role === "analyst");
  const canEdit = writable && record?.id === id && record.status === "draft";
  const dirty = Boolean(record && draft && JSON.stringify(draft) !== JSON.stringify(draftFrom(record)));
  const canSubmit = canEdit;
  const canDecide = !demo && (role === "owner" || role === "admin") && record?.id === id && record.status === "in_review";

  const applyLoadedRecord = useCallback((found: ChangeSpecificationRecord) => {
    setRecord(found);
    setDraft(draftFrom(found));
    setApprovalNote(found.approvalNote || "");
    setError("");
    setUncertain(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const found = await loadChangeSpecification(id);
      if (activeId.current === id) applyLoadedRecord(found);
    } catch (caught) {
      if (activeId.current === id) setError(caught instanceof Error ? caught.message : "Change Specification could not be loaded.");
    }
  }, [applyLoadedRecord, id]);

  useEffect(() => {
    let cancelled = false;
    void loadChangeSpecification(id).then(
      (found) => {
        if (!cancelled) applyLoadedRecord(found);
      },
      (caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Change Specification could not be loaded.");
      },
    );
    return () => { cancelled = true; };
  }, [applyLoadedRecord, id]);

  const mutate = useCallback(async (body: Record<string, unknown>, success: string) => {
    if (writing.current || uncertain || !writable || record?.id !== id) return;
    if (body.action === "update_draft" && !canEdit) return;
    if (body.action === "submit" && (!canSubmit || dirty)) return;
    if (body.action === "decision" && !canDecide) return;
    writing.current = true;
    setBusy(String(body.action || "save"));
    setError("");
    setNotice("");
    let mayHaveSaved = true;
    try {
      const response = await fetch("/api/change-specifications", {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        mayHaveSaved = response.status >= 500;
        const missing = Array.isArray(payload.missing) ? ` Missing: ${payload.missing.join(", ")}.` : "";
        const invalid = Array.isArray(payload.invalid) ? ` Invalid: ${payload.invalid.join(", ")}.` : "";
        throw new Error(`${typeof payload.error === "string" ? payload.error : "The decision could not be updated."}${missing}${invalid}`);
      }
      const saved = payload.data as ChangeSpecificationRecord | undefined;
      const expectedStatus = body.action === "submit" ? "in_review" : body.action === "decision" ? body.decision : "draft";
      if (!saved || saved.id !== id || saved.status !== expectedStatus || !Array.isArray(saved.acceptanceCriteria) || !saved.verificationPlan || typeof saved.verificationPlan !== "object") {
        throw new Error("The saved decision could not be confirmed. Reload the saved decision before trying again; this will replace the local form with persisted state.");
      }
      if (activeId.current === id) { applyLoadedRecord(saved); setNotice(success); }
    } catch (caught) {
      if (activeId.current === id) {
        setUncertain(mayHaveSaved);
        setError(caught instanceof Error ? caught.message : "The decision could not be updated.");
      }
    } finally {
      writing.current = false;
      setBusy("");
    }
  }, [applyLoadedRecord, canDecide, canEdit, canSubmit, dirty, id, record, uncertain, writable]);

  const verificationRecorded = useMemo(() => Boolean(draft?.verificationIntent.trim()), [draft]);

  if (!record || !draft || record.id !== id) return <section className="panel"><div className="empty-state"><h2>{error ? "Change Specification unavailable." : "Loading Change Specification…"}</h2><p>{error || "Reading the persisted company decision and its evidence boundary."}</p>{error && <Link className="button button--outline" href="/app">Back to Attention →</Link>}</div></section>;

  return <>
    {(error || notice) && <div className="inline-notice" role={error ? "alert" : "status"}><strong>{error ? "Decision update failed." : "Decision updated."}</strong><p>{error || notice}</p></div>}
    {uncertain && <section className="panel" aria-label="Unconfirmed decision update"><p>The update may have been saved. Reload to review persisted state before sending another update. Reloading replaces the local form.</p><button className="button button--outline" disabled={Boolean(busy)} onClick={() => void load()}>Reload saved decision</button></section>}

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Change Specification · {readable(record.status)}</span><h2>{record.title}</h2><p>{record.problemStatement}</p></div><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link></div>
      <div className="metric-grid metric-grid--compact">
        <article><span>Decision</span><strong>{readable(record.decisionState)}</strong><small>explicit company decision state</small></article>
        <article><span>Control</span><strong>{record.controlClass ? readable(record.controlClass) : "unknown"}</strong><small>{record.controlSurface || "control surface not specified"}</small></article>
        <article><span>Evidence</span><strong>{record.linkedEvidenceCount}</strong><small>verified linked record{record.linkedEvidenceCount === 1 ? "" : "s"}</small></article>
        <article><span>Verification</span><strong>{verificationRecorded ? "recorded" : "not specified"}</strong><small>future verification intent</small></article>
      </div>
      {demo ? <p className="table-caption">This fictional demo is read-only.</p> : role === "viewer" ? <p className="table-caption">Viewer access is read-only.</p> : null}
      {record.baselineRunId && <Link className="button button--outline" href={`/app/runs/${encodeURIComponent(record.baselineRunId)}`}>Inspect baseline evidence →</Link>}
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Decision body</span><h2>{canEdit ? "Define the exact company change." : "Read the saved company decision."}</h2></div></div>
      {canEdit && <p className="table-caption">{dirty ? "Save your changes before submitting this decision for review." : "Only the saved decision is submitted. An owner or admin must approve it before execution."}</p>}
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!canEdit) return; void mutate({
        action: "update_draft",
        title: draft.title,
        problemStatement: draft.problemStatement,
        exactChange: draft.exactChange,
        controlClass: draft.controlClass || null,
        controlSurface: draft.controlSurface,
        eligibilityState: draft.eligibilityState,
        decisionState: draft.decisionState,
        truthState: draft.truthState,
        confidenceState: draft.confidenceState,
        ownerRole: draft.ownerRole,
        priorityRank: draft.priorityRank ? Number(draft.priorityRank) : null,
        effort: draft.effort || null,
        acceptanceCriteria: draft.acceptanceCriteria.split("\n").map((item) => item.trim()).filter(Boolean),
        verificationPlan: (() => { const plan = { ...record.verificationPlan }; if (draft.verificationIntent.trim()) plan.intent = draft.verificationIntent.trim(); else delete plan.intent; return plan; })(),
      }, "Draft saved. The decision remains unsubmitted until you explicitly submit it for review."); }}>
        <label>Title<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.title} onChange={(event) => setDraft((current) => current && ({ ...current, title: event.target.value }))} /></label>
        <label>Observed problem<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={4} value={draft.problemStatement} onChange={(event) => setDraft((current) => current && ({ ...current, problemStatement: event.target.value }))} /></label>
        <label>Exact company change<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={5} value={draft.exactChange} onChange={(event) => setDraft((current) => current && ({ ...current, exactChange: event.target.value }))} placeholder="Describe the exact customer-owned change. Do not describe control of an AI provider." /></label>
        <div className="form-grid">
          <label>Control class<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.controlClass} onChange={(event) => setDraft((current) => current && ({ ...current, controlClass: event.target.value as Draft["controlClass"] }))}><option value="">Unknown</option><option value="CONTROLLABLE">{readable("CONTROLLABLE")}</option><option value="INFLUENCEABLE">{readable("INFLUENCEABLE")}</option><option value="UNCONTROLLABLE">{readable("UNCONTROLLABLE")}</option></select></label>
          <label>Control surface<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.controlSurface} onChange={(event) => setDraft((current) => current && ({ ...current, controlSurface: event.target.value }))} placeholder="Website, product, pricing, documentation…" /></label>
          <label>Decision<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.decisionState} onChange={(event) => setDraft((current) => current && ({ ...current, decisionState: event.target.value as Draft["decisionState"] }))}><option value="DO_NOW">{readable("DO_NOW")}</option><option value="TEST_FIRST">{readable("TEST_FIRST")}</option><option value="DO_NOT_DO">{readable("DO_NOT_DO")}</option><option value="MONITOR_ONLY">{readable("MONITOR_ONLY")}</option><option value="INSUFFICIENT_EVIDENCE">{readable("INSUFFICIENT_EVIDENCE")}</option></select></label>
          <label>Eligibility<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.eligibilityState} onChange={(event) => setDraft((current) => current && ({ ...current, eligibilityState: event.target.value as Draft["eligibilityState"] }))}><option value="ELIGIBLE">{readable("ELIGIBLE")}</option><option value="PARTIALLY_ELIGIBLE">{readable("PARTIALLY_ELIGIBLE")}</option><option value="STRUCTURALLY_INELIGIBLE">{readable("STRUCTURALLY_INELIGIBLE")}</option><option value="UNKNOWN">{readable("UNKNOWN")}</option></select></label>
          <label>Confidence<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.confidenceState} onChange={(event) => setDraft((current) => current && ({ ...current, confidenceState: event.target.value as Draft["confidenceState"] }))}><option value="HIGH">{readable("HIGH")}</option><option value="MEDIUM">{readable("MEDIUM")}</option><option value="LOW">{readable("LOW")}</option><option value="INSUFFICIENT">{readable("INSUFFICIENT")}</option></select></label>
          <label>Truth state<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.truthState} onChange={(event) => setDraft((current) => current && ({ ...current, truthState: event.target.value as Draft["truthState"] }))}><option value="OBSERVED_FACT">{readable("OBSERVED_FACT")}</option><option value="LIKELY_EXPLANATION">{readable("LIKELY_EXPLANATION")}</option><option value="HYPOTHESIS">{readable("HYPOTHESIS")}</option><option value="RECOMMENDED_EXPERIMENT">{readable("RECOMMENDED_EXPERIMENT")}</option><option value="VERIFIED_OUTCOME">{readable("VERIFIED_OUTCOME")}</option></select></label>
          <label>Owner role<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.ownerRole} onChange={(event) => setDraft((current) => current && ({ ...current, ownerRole: event.target.value }))} /></label>
          <label>Effort<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.effort} onChange={(event) => setDraft((current) => current && ({ ...current, effort: event.target.value as Draft["effort"] }))}><option value="">Not specified</option><option value="LOW">{readable("LOW")}</option><option value="MEDIUM">{readable("MEDIUM")}</option><option value="HIGH">{readable("HIGH")}</option></select></label>
          <label>Priority rank<input disabled={!canEdit || Boolean(busy) || uncertain} inputMode="numeric" value={draft.priorityRank} onChange={(event) => setDraft((current) => current && ({ ...current, priorityRank: event.target.value.replace(/\D/g, "") }))} /></label>
        </div>
        <label>Acceptance criteria<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={5} value={draft.acceptanceCriteria} onChange={(event) => setDraft((current) => current && ({ ...current, acceptanceCriteria: event.target.value }))} placeholder="One criterion per line" /></label>
        <label>Verification intent<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={4} value={draft.verificationIntent} onChange={(event) => setDraft((current) => current && ({ ...current, verificationIntent: event.target.value }))} placeholder="What later evidence would verify or falsify this decision?" /></label>
        {canEdit && <button className="button button--ink" type="submit" disabled={Boolean(busy) || uncertain}>{busy === "update_draft" ? "Saving…" : "Save decision draft"}</button>}
      </form>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Human approval boundary</span><h2>Submission and decision are explicit.</h2></div></div>
      <p>Foremention can preserve evidence and structure the decision. It does not approve the company change, publish it, control an AI provider, or claim that a later AI result was caused by the change.</p>
      <div className="workspace-heading__actions">
        {canSubmit && <button className="button button--ink" type="button" disabled={Boolean(busy) || dirty || uncertain} onClick={() => void mutate({ action: "submit" }, "Submitted for human review. The decision body is now immutable.")}>{busy === "submit" ? "Submitting…" : "Submit for review"}</button>}
        {canDecide && <><button className="button button--ink" type="button" disabled={Boolean(busy) || uncertain} onClick={() => void mutate({ action: "decision", decision: "approved", approvalNote }, "Change Specification approved by the workspace reviewer.")}>{busy === "decision" ? "Recording…" : "Approve"}</button><button className="button button--outline" type="button" disabled={Boolean(busy) || uncertain} onClick={() => void mutate({ action: "decision", decision: "rejected", approvalNote }, "Change Specification rejected by the workspace reviewer.")}>Reject</button></>}
      </div>
      {record.status === "in_review" && !canDecide && <p className="table-caption">An owner or admin must approve or reject this decision.</p>}
      {canDecide && <label>Decision note<textarea rows={3} value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} /></label>}
      {record.decisionAt && <p className="table-caption">Decision recorded · {record.decisionAt}</p>}
    </section>
  </>;
}
