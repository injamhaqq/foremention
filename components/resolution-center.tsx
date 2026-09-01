"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/app/resolutions/resolution-center.module.css";

type ApprovalStatus = "pending" | "approved" | "changes_requested" | "rejected";
type ApplicationStatus = "not_applied" | "applied" | "failed";
type FollowUpStatus = "not_requested" | "requested" | "queued" | "running" | "complete" | "incomparable" | "failed" | "cancelled";
type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";
type ChangeSpecificationStatus = "draft" | "in_review" | "approved" | "in_execution" | "completed" | "rejected";

type ChangeSpecificationSummary = {
  id: string;
  opportunityId: string;
  title: string;
  exactChange: string | null;
  status: ChangeSpecificationStatus;
  decisionState: string;
  controlClass: string | null;
  controlSurface: string | null;
};

type ChangeExecutionLink = {
  resolutionAssetId: string;
  changeSpecificationId: string;
  executionRole: string;
};

export type ResolutionEvidence = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  sourceUrl?: string | null;
  observedAt?: string | null;
  runId?: string | null;
};

export type ResolutionProposal = {
  assetType: string;
  title: string;
  summary: string;
  content: string;
  limitations: string;
  version: number;
  updatedAt: string;
};

export type ResolutionRecord = {
  id: string;
  status: string;
  problem: {
    id: string;
    type: string;
    title: string;
    summary: string;
    confidence: string;
    observedAt: string;
  };
  changeSpecification: ChangeSpecificationSummary | null;
  evidence: ResolutionEvidence[];
  proposal: ResolutionProposal | null;
  approval: {
    status: ApprovalStatus;
    note: string;
    decidedAt?: string | null;
    decidedBy?: string | null;
  };
  application: {
    status: ApplicationStatus;
    targetUrl: string;
    appliedAt?: string | null;
    error?: string | null;
  };
  followUp: {
    status: FollowUpStatus;
    baselineRunId?: string | null;
    followUpRunId?: string | null;
    requestedAt?: string | null;
    completedAt?: string | null;
    summary?: string | null;
  };
};

type Draft = Pick<ResolutionProposal, "assetType" | "title" | "summary" | "content" | "limitations">;

const blankDraft: Draft = { assetType: "comparison_page", title: "", summary: "", content: "", limitations: "" };
const assetTypes = [["comparison_page", "Comparison brief"], ["faq", "FAQ evidence brief"], ["content_brief", "Source-page brief"]] as const;
const loopSteps = ["Problem", "Evidence", "Proposed fix", "Approval", "Applied reference", "Follow-up measurement"] as const;
const reviewedChangeStatuses: ChangeSpecificationStatus[] = ["in_review", "approved", "in_execution", "completed"];

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isExternalHttpUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; }
  catch { return false; }
}

function completedSteps(record: ResolutionRecord) {
  return [true, record.evidence.length > 0, Boolean(record.proposal), record.approval.status !== "pending", record.application.status === "applied", record.followUp.status === "complete"];
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(response.ok ? "The server returned an unreadable response. Try again." : `The request failed (${response.status}) without a readable explanation.`); }
}

function evidenceHref(item: ResolutionEvidence) {
  if (item.runId) return `/app/runs/${encodeURIComponent(item.runId)}`;
  return item.sourceUrl && isExternalHttpUrl(item.sourceUrl) ? item.sourceUrl : null;
}

function LoopProgress({ record }: { record: ResolutionRecord }) {
  const complete = completedSteps(record);
  const current = complete.findIndex((value) => !value);
  return <ol className={styles.loop} aria-label="Resolution progress">
    {loopSteps.map((step, index) => {
      const state = complete[index] ? "complete" : index === current ? "current" : "waiting";
      return <li className={styles[state]} key={step} aria-current={state === "current" ? "step" : undefined}><span>{complete[index] ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>;
    })}
  </ol>;
}

function EvidenceList({ items }: { items: ResolutionEvidence[] }) {
  if (!items.length) return <div className={styles.inlineEmpty}><strong>No reviewable evidence is attached.</strong><p>This problem cannot produce an approval-ready asset until it is connected to a dated answer, citation, page review, or recorded workspace observation.</p></div>;
  return <div className={styles.evidenceList}>{items.map((item) => {
    const href = evidenceHref(item);
    return <article key={item.id}><div className={styles.cardMeta}><span>{readable(item.kind)}</span><time>{formatDate(item.observedAt)}</time></div><h4>{item.title}</h4><p>{item.detail}</p>{href && (href.startsWith("/") ? <Link className={styles.inlineLink} href={href}>Inspect recorded evidence →</Link> : <a className={styles.inlineLink} href={href} target="_blank" rel="noreferrer">Open recorded source ↗</a>)}</article>;
  })}</div>;
}

function EmptyState({ demo }: { demo: boolean }) {
  return <section className={styles.emptyState}><span className="eyebrow">No measured problem selected</span><h2>{demo ? "Resolution actions are not available in the fictional demo." : "Measure and review evidence before proposing a fix."}</h2><p>{demo ? "The demo stays read-only and cannot create customer approval records, applied references, or follow-up runs." : "Resolution Center starts with an observed problem from your own reviewed workspace records. It never manufactures a problem, solution, or result to make the page look populated."}</p><div className={styles.buttonRow}><Link className="button button--ink" href="/app/runs">Review answer runs</Link><Link className="button button--outline" href="/app/opportunities">Inspect priority gaps</Link></div></section>;
}

export function ResolutionCenter({ demo, role }: { demo: boolean; role: WorkspaceRole }) {
  const [records, setRecords] = useState<ResolutionRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [approvalNote, setApprovalNote] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedIdRef = useRef("");
  const canWrite = !demo && role !== "viewer";
  const canManage = !demo && (role === "owner" || role === "admin");

  const active = useMemo(() => records.find((record) => record.id === selectedId) || records[0] || null, [records, selectedId]);

  const hydrateEditor = useCallback((record: ResolutionRecord) => {
    selectedIdRef.current = record.id;
    setSelectedId(record.id);
    setDraft(record.proposal ? { assetType: record.proposal.assetType, title: record.proposal.title, summary: record.proposal.summary, content: record.proposal.content, limitations: record.proposal.limitations } : blankDraft);
    setApprovalNote(record.approval.note || "");
    setTargetUrl(record.application.targetUrl || "");
    setTab(record.proposal ? "preview" : "edit");
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (demo) return;
    try {
      const [resolutionResponse, changeResponse, linkResponse] = await Promise.all([
        fetch("/api/resolutions", { signal, headers: { accept: "application/json" } }),
        fetch("/api/change-specifications", { signal, headers: { accept: "application/json" } }),
        fetch("/api/change-execution-assets", { signal, headers: { accept: "application/json" } }),
      ]);
      const [resolutionPayload, changePayload, linkPayload] = await Promise.all([readResponse(resolutionResponse), readResponse(changeResponse), readResponse(linkResponse)]);
      if (!resolutionResponse.ok) throw new Error(typeof resolutionPayload.error === "string" ? resolutionPayload.error : "Resolution records could not be loaded.");
      if (!changeResponse.ok) throw new Error(typeof changePayload.error === "string" ? changePayload.error : "Change Specifications could not be loaded.");
      if (!linkResponse.ok) throw new Error(typeof linkPayload.error === "string" ? linkPayload.error : "Execution links could not be loaded.");

      const data = resolutionPayload.data as { resolutions?: Omit<ResolutionRecord, "changeSpecification">[] } | undefined;
      const rawRecords = Array.isArray(data?.resolutions) ? data.resolutions : [];
      const changes = (Array.isArray(changePayload.data) ? changePayload.data : []) as ChangeSpecificationSummary[];
      const links = (Array.isArray(linkPayload.data) ? linkPayload.data : []) as ChangeExecutionLink[];
      const changeById = new Map(changes.map((change) => [change.id, change]));
      const linkByAsset = new Map(links.map((link) => [link.resolutionAssetId, link.changeSpecificationId]));
      const changeByOpportunity = new Map<string, ChangeSpecificationSummary>();
      for (const change of changes) {
        if (change.status === "rejected") continue;
        if (!changeByOpportunity.has(change.opportunityId)) changeByOpportunity.set(change.opportunityId, change);
      }
      const next: ResolutionRecord[] = rawRecords.map((record) => {
        const linkedId = linkByAsset.get(record.id);
        const linked = linkedId ? changeById.get(linkedId) || null : null;
        const opportunityDecision = !record.proposal ? changeByOpportunity.get(record.problem.id) || null : null;
        return { ...record, changeSpecification: linked || opportunityDecision };
      });
      const selected = next.find((record) => record.id === selectedIdRef.current) || next[0];
      setError("");
      setRecords(next);
      if (selected) hydrateEditor(selected);
      else { selectedIdRef.current = ""; setSelectedId(""); }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Resolution records could not be loaded.");
    } finally { setLoading(false); }
  }, [demo, hydrateEditor]);

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(task); controller.abort(); };
  }, [load]);

  const mutate = useCallback(async (method: "POST" | "PATCH", body: Record<string, unknown>, label: string, success: string) => {
    if (!canWrite || busy) return;
    setBusy(label); setError(""); setNotice("");
    try {
      const response = await fetch("/api/resolutions", { method, headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The resolution could not be updated.");
      await load(); setNotice(success);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The resolution could not be updated."); }
    finally { setBusy(""); }
  }, [busy, canWrite, load]);

  async function generateProposal() {
    if (!active?.changeSpecification || !reviewedChangeStatuses.includes(active.changeSpecification.status)) {
      setError("A reviewed Change Specification is required before Foremention can create an execution asset.");
      return;
    }
    await mutate("POST", { action: "generate", changeSpecificationId: active.changeSpecification.id, assetType: draft.assetType }, "generate", "An execution-asset draft was created beneath the reviewed Change Specification. Review every statement before approval.");
  }

  async function saveDraft() {
    if (!active || !draft.title.trim() || !draft.summary.trim() || !draft.content.trim() || !draft.limitations.trim()) { setError("Complete the title, summary, asset content, and limitations before saving the draft."); return; }
    await mutate("PATCH", { action: "update_draft", resolutionId: active.id, ...draft }, "save", "Draft saved. It is still unapproved until a customer decision is recorded.");
  }

  async function submitForReview() {
    if (!active?.proposal) return;
    await mutate("PATCH", { action: "decision", resolutionId: active.id, decision: "submit", note: "" }, "decision:submit", "Submitted for customer review. An owner or admin records the decision.");
  }

  async function decide(decision: ApprovalStatus) {
    if (!active?.proposal || decision === "pending" || !canManage) return;
    if (decision === "changes_requested" && !approvalNote.trim()) { setError("Describe the requested change so the next revision has an accountable instruction."); return; }
    await mutate("PATCH", { action: "decision", resolutionId: active.id, decision, note: approvalNote.trim() }, `decision:${decision}`, decision === "approved" ? "Approval recorded. Foremention has not applied or published the asset." : "Decision recorded with the customer note.");
  }

  async function markApplied() {
    if (!canManage) return;
    if (!active || !targetUrl.trim()) { setError("Record the customer-controlled page, pull request, document, ticket, release, policy, or other reference where the approved execution asset was applied."); return; }
    await mutate("PATCH", { action: "mark_applied", resolutionId: active.id, reference: targetUrl }, "apply", "Applied reference recorded. This records customer action; it does not claim the change caused an AI result.");
  }

  async function requestRemeasurement() {
    if (!active || !canWrite || busy) return;
    setBusy("remeasure"); setError(""); setNotice("");
    try {
      const requestResponse = await fetch("/api/resolutions", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ action: "remeasure", resolutionId: active.id }) });
      const requestPayload = await readResponse(requestResponse);
      const requestData = requestPayload.data as { runRequest?: { promptIds?: string[]; providers?: string[]; measurementId?: string; idempotencyKey?: string } } | undefined;
      if (!requestResponse.ok) throw new Error(typeof requestPayload.error === "string" ? requestPayload.error : "The follow-up measurement request could not be prepared.");
      const runRequest = requestData?.runRequest;
      if (!runRequest?.measurementId || !runRequest.promptIds?.length || !runRequest.providers?.length) throw new Error("The follow-up request was saved, but its comparable run details are incomplete. No provider call was started.");
      const runResponse = await fetch("/api/runs", { method: "POST", headers: { "content-type": "application/json", accept: "application/json", "idempotency-key": runRequest.idempotencyKey || `resolution:${active.id}:measurement:${runRequest.measurementId}` }, body: JSON.stringify({ promptIds: runRequest.promptIds, providers: runRequest.providers }) });
      const runPayload = await readResponse(runResponse);
      if (!runResponse.ok || typeof runPayload.id !== "string") throw new Error(`${typeof runPayload.error === "string" ? runPayload.error : "The comparable run could not be queued."} The durable follow-up request remains available to retry.`);
      const attachResponse = await fetch("/api/resolutions", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ action: "remeasure", resolutionId: active.id, rerunId: runPayload.id, measurementId: runRequest.measurementId }) });
      const attachPayload = await readResponse(attachResponse);
      if (!attachResponse.ok) throw new Error(`${typeof attachPayload.error === "string" ? attachPayload.error : "The queued run could not be attached to the resolution."} The run and durable follow-up request were preserved for recovery.`);
      await load(); setNotice("Comparable follow-up measurement queued. Its result will remain separate from the baseline until review.");
    } catch (caught) { await load().catch(() => undefined); setError(caught instanceof Error ? caught.message : "The follow-up measurement could not be queued. Its durable request remains available to retry."); }
    finally { setBusy(""); }
  }

  if (loading) return <section className={styles.clientLoading} aria-busy="true"><span className={styles.pulse} /><h2>Loading measured problems…</h2><p>Foremention is retrieving this workspace’s reviewed evidence and existing approval records.</p></section>;
  if (!active) return <>{error && <div className={styles.errorBanner} role="alert"><strong>Resolution Center is unavailable.</strong><span>{error}</span><button type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></div>}<EmptyState demo={demo} /></>;

  const proposalSaved = Boolean(active.proposal);
  const approved = active.approval.status === "approved";
  const applied = active.application.status === "applied";
  const followUpBusy = active.followUp.status === "queued" || active.followUp.status === "running";
  const reviewedParent = Boolean(active.changeSpecification && reviewedChangeStatuses.includes(active.changeSpecification.status));

  return <div className={styles.center}>
    <LoopProgress record={active} />
    {(error || notice) && <div className={error ? styles.errorBanner : styles.noticeBanner} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
    {role === "viewer" && <div className={styles.noticeBanner} role="status"><span>This workspace is read-only for viewers. An owner, admin, or analyst can create and edit resolution work.</span></div>}

    <div className={styles.centerGrid}>
      <aside className={styles.problemRail} aria-label="Measured problems">
        <div className={styles.railHeading}><span>Measured problems</span><strong>{records.length}</strong></div>
        <div className={styles.problemList}>{records.map((record) => <button className={record.id === active.id ? styles.selectedProblem : ""} type="button" key={record.id} onClick={() => hydrateEditor(record)}><span>{readable(record.problem.type)}</span><strong>{record.problem.title}</strong><small>{readable(record.status)}</small></button>)}</div>
        <p className={styles.railNote}>Only workspace problems backed by persisted records belong here.</p>
      </aside>

      <div className={styles.detail}>
        <section className={styles.problemPanel}>
          <div className={styles.sectionHeading}><div><span>01 · Specific problem</span><h2>{active.problem.title}</h2></div><div className={styles.confidence}><small>Recorded confidence</small><strong>{readable(active.problem.confidence)}</strong></div></div>
          <p className={styles.problemSummary}>{active.problem.summary}</p>
          <dl className={styles.factStrip}><div><dt>Problem type</dt><dd>{readable(active.problem.type)}</dd></div><div><dt>Observed</dt><dd>{formatDate(active.problem.observedAt)}</dd></div><div><dt>Resolution state</dt><dd>{readable(active.status)}</dd></div></dl>
          {active.changeSpecification ? <div className="inline-notice" role="note"><strong>Parent Change Specification · {active.changeSpecification.title}</strong><p>{active.changeSpecification.exactChange || "The exact company change is not specified yet."} · {readable(active.changeSpecification.status)} · {readable(active.changeSpecification.decisionState)} · {active.changeSpecification.controlClass ? readable(active.changeSpecification.controlClass) : "Control unknown"}{active.changeSpecification.controlSurface ? ` · ${active.changeSpecification.controlSurface}` : ""}</p><Link className={styles.inlineLink} href={`/app/change-specifications/${encodeURIComponent(active.changeSpecification.id)}`}>Open company decision →</Link></div> : active.proposal ? <div className="inline-notice" role="note"><strong>Legacy Resolution Asset</strong><p>This stored resolution has no Change Specification link. Foremention keeps its historical recommendation semantics and will not manufacture a parent decision.</p></div> : <div className="inline-notice" role="note"><strong>No Change Specification yet.</strong><p>Create and review the company decision before generating a new execution asset.</p><Link className={styles.inlineLink} href="/app">Open Attention →</Link></div>}
        </section>

        <section className={styles.sectionPanel}>
          <div className={styles.sectionHeading}><div><span>02 · Inspectable evidence</span><h3>What supports this problem?</h3></div><small>{active.evidence.length} recorded item{active.evidence.length === 1 ? "" : "s"}</small></div>
          <EvidenceList items={active.evidence} />
          <p className={styles.limitNote}>Evidence supports the diagnosis within its date, provider, model, and review boundary. It does not prove external influence or causation.</p>
        </section>

        <section className={styles.sectionPanel}>
          <div className={styles.sectionHeading}><div><span>03 · {active.changeSpecification ? "Execution asset" : "Proposed fix"}</span><h3>{active.changeSpecification ? "Create an artifact beneath the reviewed company decision." : "Review the legacy resolution or define a Change Specification first."}</h3></div>{active.proposal && <small>Version {active.proposal.version} · {formatDate(active.proposal.updatedAt)}</small>}</div>
          {!proposalSaved && <div className={styles.generateRow}><div><strong>{reviewedParent ? "No execution asset has been created." : "A reviewed Change Specification is required."}</strong><p>{reviewedParent ? "Generation uses the reviewed parent decision plus attached evidence and preserves explicit limitations for customer review." : "Foremention will not turn an observed problem directly into a new execution asset without the canonical company decision."}</p></div>{reviewedParent && active.changeSpecification ? <button className="button button--ink" type="button" disabled={!canWrite || busy !== "" || !active.evidence.length} onClick={() => void generateProposal()}>{busy === "generate" ? "Creating draft…" : "Create execution-asset draft"}</button> : active.changeSpecification ? <Link className="button button--outline" href={`/app/change-specifications/${encodeURIComponent(active.changeSpecification.id)}`}>Complete decision first</Link> : <Link className="button button--outline" href="/app">Open Attention</Link>}</div>}

          <div className={styles.editorTabs} role="tablist" aria-label="Solution asset editor"><button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>Edit</button><button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Preview</button></div>
          {tab === "edit" ? <form className={styles.editor} onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
            <label>Asset type<select value={draft.assetType} onChange={(event) => setDraft((current) => ({ ...current, assetType: event.target.value }))}>{assetTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Asset title<input required maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="A specific, customer-owned change" /></label>
            <label className={styles.fullField}>Why this asset<textarea required maxLength={1200} rows={3} value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Explain how the asset addresses the measured problem." /></label>
            <label className={styles.fullField}>Draft content<textarea required maxLength={20_000} rows={12} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="The reviewable asset, brief, or implementation instructions." /></label>
            <label className={styles.fullField}>Limitations<textarea required maxLength={2_000} rows={4} value={draft.limitations} onChange={(event) => setDraft((current) => ({ ...current, limitations: event.target.value }))} placeholder="What this asset cannot establish, promise, or control." /></label>
            <div className={`${styles.buttonRow} ${styles.fullField}`}><button className="button button--ink" type="submit" disabled={!canWrite || busy !== "" || !proposalSaved}>{busy === "save" ? "Saving draft…" : "Save new revision"}</button><span>Saving a draft does not approve or publish it.</span></div>
          </form> : <article className={styles.preview}><div><span>{readable(draft.assetType)}</span><strong>{draft.title || "Untitled solution asset"}</strong></div><p className={styles.previewSummary}>{draft.summary || "No rationale has been written."}</p><pre>{draft.content || "No solution content has been written."}</pre><aside><strong>Limitations</strong><p>{draft.limitations || "Limitations must be recorded before approval."}</p></aside></article>}
        </section>

        <section className={styles.twoColumn}>
          <div className={styles.sectionPanel}><div className={styles.sectionHeading}><div><span>04 · Customer decision</span><h3>Approve, reject, or request changes to the execution artifact.</h3></div><small>{readable(active.approval.status)}</small></div><label className={styles.stackLabel}>Decision note<textarea rows={4} maxLength={2_000} value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Record why this artifact is approved, rejected, or needs revision." /></label><div className={styles.decisionButtons}>{active.status === "draft" && <button className="button button--outline" type="button" disabled={!canWrite || busy !== "" || !proposalSaved} onClick={() => void submitForReview()}>{busy === "decision:submit" ? "Submitting…" : "Submit for review"}</button>}<button className="button button--ink" type="button" disabled={!canManage || busy !== "" || !proposalSaved} onClick={() => void decide("approved")}>{busy === "decision:approved" ? "Recording…" : "Approve asset"}</button><button className="button button--outline" type="button" disabled={!canManage || busy !== "" || !proposalSaved} onClick={() => void decide("changes_requested")}>{busy === "decision:changes_requested" ? "Recording…" : "Request changes"}</button><button className={styles.textButton} type="button" disabled={!canManage || busy !== "" || !proposalSaved} onClick={() => void decide("rejected")}>{busy === "decision:rejected" ? "Recording…" : "Reject"}</button></div>{!canManage && role !== "viewer" && <p className={styles.auditLine}>An owner or admin must record the approval decision.</p>}{active.approval.decidedAt && <p className={styles.auditLine}>Decision recorded {formatDate(active.approval.decidedAt)}{active.approval.decidedBy ? ` by ${active.approval.decidedBy}` : ""}.</p>}</div>
          <div className={styles.sectionPanel}><div className={styles.sectionHeading}><div><span>05 · Applied reference</span><h3>Record where your team applied it.</h3></div><small>{readable(active.application.status)}</small></div><label className={styles.stackLabel}>Applied reference<input type="text" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="Page, pull request, document, ticket, release, policy, or other reference" /></label><button className="button button--ink" type="button" disabled={!canManage || busy !== "" || !approved} onClick={() => void markApplied()}>{busy === "apply" ? "Recording…" : applied ? "Update applied reference" : "Record applied reference"}</button><p className={styles.auditLine}>{approved ? "Foremention records the customer-controlled reference. It does not publish, rank, or change provider behavior from this action." : "Customer approval is required before an applied reference can be recorded."}</p>{active.application.appliedAt && <p className={styles.auditLine}>Applied {formatDate(active.application.appliedAt)}.</p>}{active.application.error && <p className={styles.inlineError}>{active.application.error}</p>}</div>
        </section>

        <section className={`${styles.sectionPanel} ${styles.followUp}`}><div><span>06 · Follow-up measurement</span><h3>Measure the same question and conditions again.</h3><p>A comparable follow-up preserves the baseline, provider, model, and question so the customer can inspect change without turning correlation into a causal claim.</p>{active.followUp.summary && <blockquote>{active.followUp.summary}</blockquote>}</div><div className={styles.followUpAction}><strong>{readable(active.followUp.status)}</strong>{active.followUp.followUpRunId && <Link className={styles.inlineLink} href={`/app/runs/${encodeURIComponent(active.followUp.followUpRunId)}`}>Inspect follow-up run →</Link>}<button className="button button--ink" type="button" disabled={!canWrite || busy !== "" || !applied || followUpBusy} onClick={() => void requestRemeasurement()}>{busy === "remeasure" || followUpBusy ? "Measurement queued…" : active.followUp.status === "complete" || active.followUp.status === "incomparable" ? "Run another comparison" : "Request comparable measurement"}</button></div></section>
      </div>
    </div>
  </div>;
}
