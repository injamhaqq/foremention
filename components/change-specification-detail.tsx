"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChangeSpecificationStatus = "draft" | "in_review" | "approved" | "in_execution" | "completed" | "rejected";
type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer" | "demo" | null;
type WorkspacePermissions = { role: WorkspaceRole; canWrite: boolean; canDecide: boolean };
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

type LoadedChangeSpecification = {
  record: ChangeSpecificationRecord;
  permissions: WorkspacePermissions;
};

const readonlyPermissions: WorkspacePermissions = { role: null, canWrite: false, canDecide: false };
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

const verificationPlanFor = (record: ChangeSpecificationRecord, draft: Draft) => {
  const verificationPlan = { ...record.verificationPlan };
  const intent = draft.verificationIntent.trim();
  if (intent) verificationPlan.intent = intent;
  else delete verificationPlan.intent;
  return verificationPlan;
};

const draftUpdate = (record: ChangeSpecificationRecord, draft: Draft) => ({
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
  verificationPlan: verificationPlanFor(record, draft),
});

function parsePermissions(value: unknown): WorkspacePermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return readonlyPermissions;
  const candidate = value as Record<string, unknown>;
  const role = candidate.role;
  const validRole = role === "owner" || role === "admin" || role === "analyst" || role === "viewer" || role === "demo" ? role : null;
  return { role: validRole, canWrite: candidate.canWrite === true, canDecide: candidate.canDecide === true };
}

async function loadChangeSpecification(id: string): Promise<LoadedChangeSpecification> {
  const response = await fetch("/api/change-specifications", { headers: { accept: "application/json" } });
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Change Specifications could not be loaded.");
  const rows = Array.isArray(payload.data) ? payload.data as ChangeSpecificationRecord[] : [];
  const found = rows.find((item) => item.id === id) || null;
  if (!found) throw new Error("Change Specification not found in this workspace.");
  return { record: found, permissions: parsePermissions(payload.permissions) };
}

function permissionSummary(permissions: WorkspacePermissions) {
  if (permissions.role === "owner" || permissions.role === "admin") return "You can edit and submit drafts, and record approval decisions when a decision is in review.";
  if (permissions.role === "analyst") return "You can edit and submit drafts. Approval and rejection are reserved for workspace owners and admins.";
  if (permissions.role === "viewer") return "Read-only access. Owners, admins, and analysts can edit or submit drafts.";
  if (permissions.role === "demo") return "Demo access is read-only and cannot mutate customer decisions.";
  return "Decision permissions are unavailable. This record is read-only until the workspace role can be verified.";
}

export function ChangeSpecificationDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<ChangeSpecificationRecord | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [permissions, setPermissions] = useState<WorkspacePermissions>(readonlyPermissions);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const mutationLock = useRef(false);

  const applyLoaded = useCallback((loaded: LoadedChangeSpecification) => {
    setRecord(loaded.record);
    setDraft(draftFrom(loaded.record));
    setPermissions(loaded.permissions);
    setApprovalNote(loaded.record.approvalNote || "");
    setError("");
    setUncertain(false);
  }, []);

  const applyMutationRecord = useCallback((next: ChangeSpecificationRecord) => {
    setRecord(next);
    setDraft(draftFrom(next));
    setApprovalNote(next.approvalNote || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadChangeSpecification(id).then(
      (loaded) => {
        if (!cancelled) applyLoaded(loaded);
      },
      (caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Change Specification could not be loaded.");
      },
    );
    return () => { cancelled = true; };
  }, [applyLoaded, id]);

  const requestMutation = useCallback(async (body: Record<string, unknown>) => {
    let ambiguous = true;
    try {
    const response = await fetch("/api/change-specifications", {
      method: "PATCH",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      ambiguous = response.status >= 500 || response.status === 408;
      const missing = Array.isArray(payload.missing) ? ` Missing: ${payload.missing.join(", ")}.` : "";
      const invalid = Array.isArray(payload.invalid) ? ` Invalid: ${payload.invalid.join(", ")}.` : "";
      throw new Error(`${typeof payload.error === "string" ? payload.error : "The decision could not be updated."}${missing}${invalid}`);
    }
    const saved = payload.data as ChangeSpecificationRecord | undefined;
    const expectedStatus = body.action === "submit" ? "in_review" : body.action === "decision" ? body.decision : "draft";
    if (!saved || saved.id !== id || saved.status !== expectedStatus || !Array.isArray(saved.acceptanceCriteria) || !saved.verificationPlan || typeof saved.verificationPlan !== "object" || Array.isArray(saved.verificationPlan)) {
      throw new Error("The server did not return the saved Change Specification.");
    }
    return payload.data as ChangeSpecificationRecord;
    } catch (caught) {
      const failure = new Error(caught instanceof Error ? caught.message : "The saved decision could not be confirmed.");
      Object.assign(failure, { ambiguous });
      throw failure;
    }
  }, [id]);

  const runMutation = useCallback(async (kind: string, operation: () => Promise<ChangeSpecificationRecord>, success: string) => {
    if (mutationLock.current || uncertain) return;
    mutationLock.current = true;
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      const next = await operation();
      applyMutationRecord(next);
      setNotice(success);
    } catch (caught) {
      setUncertain(Boolean(caught && typeof caught === "object" && "ambiguous" in caught && caught.ambiguous));
      setError(caught instanceof Error ? caught.message : "The decision could not be updated.");
    } finally {
      mutationLock.current = false;
      setBusy("");
    }
  }, [applyMutationRecord, uncertain]);

  const reloadSaved = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy("reload");
    setNotice("");
    try { applyLoaded(await loadChangeSpecification(id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The saved decision could not be read."); }
    finally { mutationLock.current = false; setBusy(""); }
  };

  const canEdit = Boolean(record?.status === "draft" && permissions.canWrite);
  const canSubmit = canEdit;
  const canDecide = Boolean(record?.status === "in_review" && permissions.canDecide);
  const verificationRecorded = useMemo(() => Boolean(draft?.verificationIntent.trim()), [draft]);
  const dirty = useMemo(() => Boolean(record && draft && JSON.stringify(draft) !== JSON.stringify(draftFrom(record))), [draft, record]);

  if (!record || !draft) return <section className="panel"><div className="empty-state"><h2>{error ? "Change Specification unavailable." : "Loading Change Specification…"}</h2><p>{error || "Reading the persisted company decision and its evidence boundary."}</p>{error && <Link className="button button--outline" href="/app">Back to Attention →</Link>}</div></section>;

  const saveDraft = () => runMutation("update_draft", () => requestMutation(draftUpdate(record, draft)), "Draft saved. The decision remains unsubmitted until you explicitly submit it for review.");

  const submitForReview = () => runMutation("submit", async () => {
    if (dirty) await requestMutation(draftUpdate(record, draft));
    return requestMutation({ action: "submit" });
  }, dirty
    ? "Current edits were saved and the Change Specification was submitted for human review."
    : "Submitted for human review. The decision body is now immutable.");

  const decide = (decision: "approved" | "rejected") => runMutation(
    "decision",
    () => requestMutation({ action: "decision", decision, approvalNote }),
    decision === "approved"
      ? "Change Specification approved by the workspace reviewer."
      : "Change Specification rejected by the workspace reviewer.",
  );

  return <>
    {(error || notice) && <div className="inline-notice" role={error ? "alert" : "status"}><strong>{error ? "Decision update failed." : "Decision updated."}</strong><p>{error || notice}</p></div>}
    {uncertain && <div className="inline-notice" role="alert"><strong>We cannot confirm what was saved.</strong><p>Review the saved decision before trying another update. Reloading replaces your local edits with persisted state.</p><button className="button button--outline" type="button" disabled={Boolean(busy)} onClick={() => void reloadSaved()}>{busy === "reload" ? "Reloading…" : "Reload saved decision"}</button></div>}

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Change Specification · {readable(record.status)}</span><h2>{record.title}</h2><p>{record.problemStatement}</p></div><Link className="button button--outline" href="/app/resolutions">Open Resolution Center</Link></div>
      <div className="metric-grid metric-grid--compact">
        <article><span>Decision</span><strong>{readable(record.decisionState)}</strong><small>explicit company decision state</small></article>
        <article><span>Control</span><strong>{record.controlClass ? readable(record.controlClass) : "unknown"}</strong><small>{record.controlSurface || "control surface not specified"}</small></article>
        <article><span>Evidence</span><strong>{record.linkedEvidenceCount}</strong><small>verified linked record{record.linkedEvidenceCount === 1 ? "" : "s"}</small></article>
        <article><span>Verification</span><strong>{verificationRecorded ? "recorded" : "not specified"}</strong><small>future verification intent</small></article>
      </div>
      <p className="table-caption">Workspace role: {permissions.role ? readable(permissions.role) : "unverified"}. {permissionSummary(permissions)}</p>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Decision body</span><h2>{canEdit ? "Define the exact company change." : record.status === "draft" ? "This draft is read-only for your workspace role." : "Submitted decision body is immutable."}</h2></div></div>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (canEdit && dirty) void saveDraft(); }}>
        <label>Title<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.title} onChange={(event) => setDraft((current) => current && ({ ...current, title: event.target.value }))} /></label>
        <label>Observed problem<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={4} value={draft.problemStatement} onChange={(event) => setDraft((current) => current && ({ ...current, problemStatement: event.target.value }))} /></label>
        <label>Exact company change<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={5} value={draft.exactChange} onChange={(event) => setDraft((current) => current && ({ ...current, exactChange: event.target.value }))} placeholder="Describe the exact customer-owned change. Do not describe control of an AI provider." /></label>
        <div className="form-grid">
          <label>Control class<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.controlClass} onChange={(event) => setDraft((current) => current && ({ ...current, controlClass: event.target.value as Draft["controlClass"] }))}><option value="">Unknown</option><option>CONTROLLABLE</option><option>INFLUENCEABLE</option><option>UNCONTROLLABLE</option></select></label>
          <label>Control surface<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.controlSurface} onChange={(event) => setDraft((current) => current && ({ ...current, controlSurface: event.target.value }))} placeholder="Website, product, pricing, documentation…" /></label>
          <label>Decision<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.decisionState} onChange={(event) => setDraft((current) => current && ({ ...current, decisionState: event.target.value as Draft["decisionState"] }))}><option>DO_NOW</option><option>TEST_FIRST</option><option>DO_NOT_DO</option><option>MONITOR_ONLY</option><option>INSUFFICIENT_EVIDENCE</option></select></label>
          <label>Eligibility<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.eligibilityState} onChange={(event) => setDraft((current) => current && ({ ...current, eligibilityState: event.target.value as Draft["eligibilityState"] }))}><option>ELIGIBLE</option><option>PARTIALLY_ELIGIBLE</option><option>STRUCTURALLY_INELIGIBLE</option><option>UNKNOWN</option></select></label>
          <label>Confidence<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.confidenceState} onChange={(event) => setDraft((current) => current && ({ ...current, confidenceState: event.target.value as Draft["confidenceState"] }))}><option>HIGH</option><option>MEDIUM</option><option>LOW</option><option>INSUFFICIENT</option></select></label>
          <label>Truth state<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.truthState} onChange={(event) => setDraft((current) => current && ({ ...current, truthState: event.target.value as Draft["truthState"] }))}><option>OBSERVED_FACT</option><option>LIKELY_EXPLANATION</option><option>HYPOTHESIS</option><option>RECOMMENDED_EXPERIMENT</option><option>VERIFIED_OUTCOME</option></select></label>
          <label>Owner role<input disabled={!canEdit || Boolean(busy) || uncertain} value={draft.ownerRole} onChange={(event) => setDraft((current) => current && ({ ...current, ownerRole: event.target.value }))} /></label>
          <label>Effort<select disabled={!canEdit || Boolean(busy) || uncertain} value={draft.effort} onChange={(event) => setDraft((current) => current && ({ ...current, effort: event.target.value as Draft["effort"] }))}><option value="">Not specified</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
          <label>Priority rank<input disabled={!canEdit || Boolean(busy) || uncertain} inputMode="numeric" value={draft.priorityRank} onChange={(event) => setDraft((current) => current && ({ ...current, priorityRank: event.target.value.replace(/\D/g, "") }))} /></label>
        </div>
        <label>Acceptance criteria<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={5} value={draft.acceptanceCriteria} onChange={(event) => setDraft((current) => current && ({ ...current, acceptanceCriteria: event.target.value }))} placeholder="One criterion per line" /></label>
        <label>Verification intent<textarea disabled={!canEdit || Boolean(busy) || uncertain} rows={4} value={draft.verificationIntent} onChange={(event) => setDraft((current) => current && ({ ...current, verificationIntent: event.target.value }))} placeholder="What later evidence would verify or falsify this decision?" /></label>
        {canEdit && <div className="workspace-heading__actions"><button className="button button--ink" type="submit" disabled={uncertain || Boolean(busy) || !dirty}>{busy === "update_draft" ? "Saving…" : dirty ? "Save decision draft" : "Draft saved"}</button>{dirty && <span className="table-caption">Unsaved changes will be saved before submission.</span>}</div>}
      </form>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Human approval boundary</span><h2>Submission and decision are explicit.</h2></div></div>
      <p>Foremention can preserve evidence and structure the decision. It does not approve the company change, publish it, control an AI provider, or claim that a later AI result was caused by the change.</p>
      <div className="workspace-heading__actions">
        {canSubmit && <button className="button button--ink" type="button" disabled={uncertain || Boolean(busy)} onClick={() => void submitForReview()}>{busy === "submit" ? (dirty ? "Saving and submitting…" : "Submitting…") : dirty ? "Save & submit for review" : "Submit for review"}</button>}
        {canDecide && <><button className="button button--ink" type="button" disabled={uncertain || Boolean(busy)} onClick={() => void decide("approved")}>{busy === "decision" ? "Recording…" : "Approve"}</button><button className="button button--outline" type="button" disabled={uncertain || Boolean(busy)} onClick={() => void decide("rejected")}>Reject</button></>}
      </div>
      {record.status === "in_review" && !permissions.canDecide && <p className="table-caption">Waiting for a workspace owner or admin to approve or reject this Change Specification.</p>}
      {canDecide && <label>Decision note<textarea rows={3} value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} /></label>}
      {record.decisionAt && <p className="table-caption">Decision recorded · {record.decisionAt}</p>}
    </section>
  </>;
}
