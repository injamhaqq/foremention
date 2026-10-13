import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { SharedRecordActions } from "@/components/shared-record-actions";
import { loadRecordIntegrity } from "@/lib/record-integrity";
import { hashRecordShareToken, recordShareIsActive } from "@/lib/record-sharing";
import { supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared Recommendation Record | Foremention", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };

type ShareRow = { organization_id: string; run_id: string; include_evidence: boolean; expires_at: string; revoked_at: string | null };
type ViewMode = "stakeholder" | "executive";

export default async function SharedRecordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ view?: string | string[] }> }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const viewMode: ViewMode = requestedView === "executive" ? "executive" : "stakeholder";
  let tokenHash: string;
  try { tokenHash = await hashRecordShareToken(token); } catch { notFound(); }

  const shares = await supabaseRest<ShareRow[]>(
    `record_shares?select=organization_id,run_id,include_evidence,expires_at,revoked_at&token_hash=eq.${tokenHash}&limit=1`,
    { serviceRole: true },
  );
  const share = shares[0];
  if (!share || !recordShareIsActive({ expiresAt: share.expires_at, revokedAt: share.revoked_at })) notFound();

  const record = await loadRecordIntegrity({
    organizationId: share.organization_id,
    runId: share.run_id,
    serviceRole: true,
  });
  if (!record) notFound();

  const run = record.run;
  const answers = record.completeObservationCoverage ? record.answers : [];

  return <main className="shared-record-shell">
    <header className="shared-record-header"><Wordmark /><span>Private link · Read-only {viewMode === "executive" ? "executive" : "stakeholder"} view</span></header>
    <section className="shared-record-hero">
      <div>
        <span className="eyebrow">Recommendation Record · {run.id.slice(0, 8).toUpperCase()}</span>
        <h1>{viewMode === "executive" ? "Decision context without workspace exposure." : "Evidence that can be challenged."}</h1>
        <p>This shared view is frozen to one recorded collection. It does not expose workspace navigation, private notes, credentials, or unrelated customer data.</p>
      </div>
      <dl>
        <div><dt>Observed</dt><dd>{run.answer_count} answers</dd></div>
        <div><dt>Returned</dt><dd>{run.citation_count} citation observations</dd></div>
        <div><dt>Reviewed</dt><dd>{record.verifiedAnswers} answers</dd></div>
        <div><dt>Safe conclusion</dt><dd>{record.safeConclusion ? "Available" : "Withheld"}</dd></div>
      </dl>
    </section>
    <section className="shared-evidence-chain" aria-label="Evidence state"><span>Returned</span><span>Retrieved</span><span>Observed</span><span>Reviewed</span><strong>Safe conclusion</strong></section>

    {viewMode === "executive"
      ? <section className="shared-record-list"><article>
        <div className="shared-record-list__meta"><span>Executive view</span><span>{record.safeConclusion ? "Reviewed conclusion available" : "Conclusion withheld"}</span></div>
        <h2>What this Record can support</h2>
        <p>{record.safeConclusion
          ? `${record.verifiedAnswers} reviewed answer${record.verifiedAnswers === 1 ? "" : "s"} form the independently verified persisted answer set for this collection. Use the stakeholder view to inspect the underlying provider output and returned-reference evidence before making a stronger claim.`
          : record.reason || "The current persisted evidence state does not support a safe conclusion."}</p>
        <p className="table-caption">Planned slots: {record.expectedSlots} · failed: {record.failedSlots} · missing: {record.missingSlots} · excluded answers: {record.excludedAnswers}. Executive view intentionally withholds detailed answer text and returned source locations.</p>
      </article></section>
      : !record.completeObservationCoverage
        ? <section className="shared-record-list"><article>
          <div className="shared-record-list__meta"><span>Record integrity</span><span>Details withheld</span></div>
          <h2>The complete persisted Record could not be independently proven.</h2>
          <p>{record.reason || "Answer details stay withheld rather than presenting a bounded or incomplete read as the full Recommendation Record."}</p>
          <p className="table-caption">Planned slots: {record.expectedSlots} · failed: {record.failedSlots} · missing: {record.missingSlots}.</p>
        </article></section>
        : <section className="shared-record-list">
          {!record.safeConclusion && <article>
            <div className="shared-record-list__meta"><span>Interpretation boundary</span><span>Conclusion withheld</span></div>
            <h2>The complete Record is inspectable, but stronger interpretation is withheld.</h2>
            <p>{record.reason || "The review or failure state does not support a safe conclusion."}</p>
            <p className="table-caption">Failed slots: {record.failedSlots} · excluded answers: {record.excludedAnswers}.</p>
          </article>}
          {answers.map((answer) => <article key={answer.id}>
            <div className="shared-record-list__meta"><span>{answer.provider}{answer.model ? ` · ${answer.model}` : ""}</span><span>{answer.review_status === "verified" ? "Reviewed" : answer.review_status === "excluded" ? "Excluded" : "Unreviewed"}</span></div>
            <h2>{answer.prompt_text || answer.prompt_key}</h2>
            <p>{answer.answer_text}</p>
            {share.include_evidence && Array.isArray(answer.citations_json) && answer.citations_json.length > 0 && <details>
              <summary>Returned references ({answer.citations_json.length})</summary>
              <ul>{answer.citations_json.map((citation, index) => <li key={`${citation.url || "reference"}-${index}`}>{citation.title || citation.url || `Returned reference ${index + 1}`}{citation.url && <small>{citation.url}</small>}</li>)}</ul>
              <p className="table-caption">A returned reference is evidence of what the provider returned. It does not prove the source caused the recommendation.</p>
            </details>}
          </article>)}
        </section>}
    <footer className="shared-record-footer">
      <p>Methodology {run.methodology_version} · Collection {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(run.completed_at || run.created_at))}</p>
      <p>Foremention separates provider output, returned references, observed evidence, human review, failures, and conclusions.</p>
    </footer>
    <SharedRecordActions viewMode={viewMode} includeEvidence={share.include_evidence} />
  </main>;
}
