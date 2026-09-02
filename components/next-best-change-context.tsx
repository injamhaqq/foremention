"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Evaluation = {
  id: string;
  change_specification_id: string;
  priority_band: string;
  ordinal_rank: number;
  reason_codes_json: string[];
};

type Cycle = {
  id: string;
  lifecycle_state: string;
  objective: string;
  started_at: string | null;
  measurement_due_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
};

type Progress = {
  has_execution_asset: boolean;
  has_applied_reference: boolean;
  has_follow_up: boolean;
  has_verification_assessment: boolean;
};

type Verification = {
  verification_state: string;
  comparison_eligible: boolean;
  reason_codes_json: string[];
  limitations: string[];
  assessed_at: string;
};

type Learning = {
  learning_key: string;
  assessment_count: number;
  comparable_assessment_count: number;
  improved_count: number;
  unchanged_count: number;
  worsened_count: number;
  insufficient_evidence_count: number;
};

type Payload = {
  pendingMigration?: boolean;
  evaluations?: Evaluation[];
  cycle?: Cycle | null;
  progress?: Progress | null;
  latestVerification?: Verification | null;
  learning?: Learning[];
  error?: string;
};

const readable = (value: string) => value.replaceAll("_", " ").toLowerCase();

async function readPayload(response: Response) {
  const value = await response.json().catch(() => ({}));
  return value && typeof value === "object" ? value as Payload : {};
}

export function NextBestChangeContext({ changeSpecificationId }: { changeSpecificationId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [objective, setObjective] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/next-best-change?changeSpecificationId=${encodeURIComponent(changeSpecificationId)}`, { headers: { accept: "application/json" } });
    const next = await readPayload(response);
    if (!response.ok) throw new Error(next.error || "Next Best Change context could not be loaded.");
    setPayload(next);
  }, [changeSpecificationId]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/next-best-change?changeSpecificationId=${encodeURIComponent(changeSpecificationId)}`, { headers: { accept: "application/json" } }).then(async (response) => {
      const next = await readPayload(response);
      if (!response.ok) throw new Error(next.error || "Next Best Change context could not be loaded.");
      if (!cancelled) setPayload(next);
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Next Best Change context could not be loaded.");
    });
    return () => { cancelled = true; };
  }, [changeSpecificationId]);

  const mutate = useCallback(async (action: string, body: Record<string, unknown>, success: string) => {
    if (busy) return;
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/next-best-change", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const next = await readPayload(response);
      if (!response.ok) throw new Error(next.error || "The operation could not be completed.");
      await load();
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The operation could not be completed.");
    } finally {
      setBusy("");
    }
  }, [busy, load]);

  const evaluation = useMemo(
    () => payload?.evaluations?.find((item) => item.change_specification_id === changeSpecificationId) || null,
    [changeSpecificationId, payload?.evaluations],
  );

  if (!payload && !error) return <section className="panel"><p>Loading Next Best Company Change context…</p></section>;

  return <section className="panel">
    <div className="panel-heading"><div><span className="eyebrow">Decision ordering + learning</span><h2>Next Best Company Change</h2><p>Next Best Company Change is an explainable ordering aid. It does not approve a company change.</p></div></div>

    {(error || notice) && <div className="inline-notice" role={error ? "alert" : "status"}><strong>{error ? "Context update failed." : "Context updated."}</strong><p>{error || notice}</p></div>}

    {payload?.pendingMigration ? <div className="empty-state"><strong>Decision-learning migration pending.</strong><p>The current Change Specification remains available; no ordering or partner state is invented while the migration is unavailable.</p></div> : <>
      <div className="metric-grid metric-grid--compact">
        <article><span>Recommended band</span><strong>{evaluation ? evaluation.priority_band : "Not evaluated"}</strong><small>{evaluation ? `Ordinal ${evaluation.ordinal_rank}` : "Run an explainable evaluation when evidence is ready."}</small></article>
        <article><span>External execution</span><strong>{payload?.cycle ? readable(payload.cycle.lifecycle_state) : "Not verified"}</strong><small>{payload?.cycle ? "First-party external cycle" : "No legitimate design-partner cycle recorded."}</small></article>
        <article><span>Verification</span><strong>{payload?.latestVerification ? readable(payload.latestVerification.verification_state) : "Not assessed"}</strong><small>{payload?.latestVerification?.comparison_eligible ? "Comparable observation" : "No comparable verified assessment yet."}</small></article>
        <article><span>Learning records</span><strong>{payload?.learning?.reduce((sum, row) => sum + Number(row.assessment_count || 0), 0) || 0}</strong><small>Persisted verification assessments only.</small></article>
      </div>

      {evaluation && <div className="form-stack"><div><strong>Why this ordering?</strong><p>{evaluation.reason_codes_json.length ? evaluation.reason_codes_json.map(readable).join(" · ") : "No additional ordering reason recorded."}</p></div></div>}

      <div className="workspace-heading__actions">
        <button className="button button--outline" type="button" disabled={Boolean(busy)} onClick={() => void mutate("evaluate_next_best_changes", {}, "Next Best ordering refreshed from persisted evidence and human decision states.")}>{busy === "evaluate_next_best_changes" ? "Evaluating…" : "Refresh Next Best ordering"}</button>
        {payload?.cycle && <button className="button button--outline" type="button" disabled={Boolean(busy)} onClick={() => void mutate("refresh_design_partner_cycle", { cycleId: payload.cycle?.id }, "External execution progress refreshed from factual execution and measurement records.")}>{busy === "refresh_design_partner_cycle" ? "Refreshing…" : "Refresh external execution"}</button>}
      </div>

      {!payload?.cycle && <div className="form-stack">
        <label>Verified external execution objective<textarea rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Use only for a real design partner/customer already verified in first-party commercial records." /></label>
        <button className="button button--outline" type="button" disabled={Boolean(busy) || objective.trim().length < 3} onClick={() => void mutate("start_design_partner_cycle", { changeSpecificationId, objective }, "Verified external execution cycle started.")}>{busy === "start_design_partner_cycle" ? "Checking evidence…" : "Start verified external cycle"}</button>
        <p className="table-caption">This action fails closed unless the organization is explicitly classified as a design partner/customer, included in company KPIs, and linked to a first-party commercial account.</p>
      </div>}

      {payload?.progress && <dl className="fact-grid">
        <div><dt>Execution asset</dt><dd>{payload.progress.has_execution_asset ? "Recorded" : "Not recorded"}</dd></div>
        <div><dt>Applied reference</dt><dd>{payload.progress.has_applied_reference ? "Recorded" : "Not recorded"}</dd></div>
        <div><dt>Comparable follow-up</dt><dd>{payload.progress.has_follow_up ? "Recorded" : "Not recorded"}</dd></div>
        <div><dt>Verification assessment</dt><dd>{payload.progress.has_verification_assessment ? "Recorded" : "Not recorded"}</dd></div>
      </dl>}

      {payload?.latestVerification && <div className="form-stack"><strong>Verification limitations</strong><p>{payload.latestVerification.limitations.join(" ") || "No additional limitation recorded."}</p></div>}

      <p className="table-caption">Observed before-and-after association only. This record does not establish that the applied change caused the result.</p>
    </>}
  </section>;
}
