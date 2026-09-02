"use client";

import { useEffect, useState } from "react";

type DecisionIntelligencePayload = {
  pendingMigration?: boolean;
  counts?: {
    verifiedTruth?: number;
    verifiedRequirements?: number;
    crossBusinessEvidence?: number;
  };
  latestEligibility?: {
    state?: string;
    reason_codes_json?: string[];
    evaluated_at?: string;
  } | null;
  crossBusinessEvidence?: Array<{ evidence_type?: string }>;
};

const readable = (value: string) => value.replaceAll("_", " ").toLowerCase();

export function DecisionIntelligenceContext({ changeSpecificationId }: { changeSpecificationId: string }) {
  const [payload, setPayload] = useState<DecisionIntelligencePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = `/api/decision-intelligence?changeSpecificationId=${encodeURIComponent(changeSpecificationId)}`;
    void fetch(url, { headers: { accept: "application/json" }, cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({})) as DecisionIntelligencePayload & { error?: string };
      if (!response.ok) throw new Error(body.error || "Decision intelligence could not be loaded.");
      return body;
    }).then(
      (body) => { if (!cancelled) setPayload(body); },
      (caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Decision intelligence could not be loaded."); },
    );
    return () => { cancelled = true; };
  }, [changeSpecificationId]);

  const counts = payload?.counts || {};
  const evidenceTypes = Array.from(new Set((payload?.crossBusinessEvidence || []).map((item) => item.evidence_type).filter((value): value is string => Boolean(value))));
  const reasons = payload?.latestEligibility?.reason_codes_json || [];

  return <section className="panel">
    <div className="panel-heading"><div><span className="eyebrow">Decision intelligence context</span><h2>Verified company facts, eligibility, and business evidence.</h2><p>Decision intelligence informs human review. It does not authorize a company change or prove causality.</p></div></div>
    {error ? <div className="inline-notice" role="status"><strong>Decision intelligence unavailable.</strong><p>{error}</p></div>
      : payload?.pendingMigration ? <div className="inline-notice" role="status"><strong>Database migration pending.</strong><p>This context will appear after the Decision Intelligence v1 migration reaches the workspace.</p></div>
        : !payload ? <p className="table-caption">Loading verified decision context…</p>
          : <>
            <div className="metric-grid metric-grid--compact">
              <article><span>Company Truth</span><strong>{counts.verifiedTruth || 0}</strong><small>current verified fact{counts.verifiedTruth === 1 ? "" : "s"}</small></article>
              <article><span>Eligibility</span><strong>{payload.latestEligibility?.state ? readable(payload.latestEligibility.state) : "not evaluated"}</strong><small>{counts.verifiedRequirements || 0} verified requirement{counts.verifiedRequirements === 1 ? "" : "s"}</small></article>
              <article><span>Business evidence</span><strong>{counts.crossBusinessEvidence || 0}</strong><small>verified linked item{counts.crossBusinessEvidence === 1 ? "" : "s"}</small></article>
            </div>
            <div className="form-grid">
              <div><span className="eyebrow">Eligibility reasons</span><p>{reasons.length ? reasons.map(readable).join(" · ") : "No verified eligibility evaluation has been recorded."}</p></div>
              <div><span className="eyebrow">Cross-business evidence types</span><p>{evidenceTypes.length ? evidenceTypes.map(readable).join(" · ") : "No verified cross-business evidence is linked."}</p></div>
            </div>
          </>}
  </section>;
}
