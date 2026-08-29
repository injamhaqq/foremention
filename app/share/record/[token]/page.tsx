import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { hashRecordShareToken, recordShareIsActive } from "@/lib/record-sharing";
import { supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared Recommendation Record | Foremention", robots: { index: false, follow: false, nocache: true } };

type ShareRow = { organization_id: string; run_id: string; include_evidence: boolean; expires_at: string; revoked_at: string | null };
type RunRow = { id: string; status: string; provider_ids: string[]; prompt_count: number; answer_count: number; citation_count: number; brand_presence_pct: number | string; methodology_version: string; created_at: string; completed_at: string | null };
type AnswerRow = { id: string; prompt_text: string | null; prompt_key: string; provider: string; model: string | null; answer_text: string; citations_json: Array<{ url?: string; title?: string }> | null; review_status: string; collected_at: string };

export default async function SharedRecordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let tokenHash: string;
  try { tokenHash = await hashRecordShareToken(token); } catch { notFound(); }
  const shares = await supabaseRest<ShareRow[]>(`record_shares?select=organization_id,run_id,include_evidence,expires_at,revoked_at&token_hash=eq.${tokenHash}&limit=1`, { serviceRole: true });
  const share = shares[0];
  if (!share || !recordShareIsActive({ expiresAt: share.expires_at, revokedAt: share.revoked_at })) notFound();
  const [runs, answers] = await Promise.all([
    supabaseRest<RunRow[]>(`runs?select=id,status,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,methodology_version,created_at,completed_at&id=eq.${share.run_id}&organization_id=eq.${share.organization_id}&limit=1`, { serviceRole: true }),
    supabaseRest<AnswerRow[]>(`run_answers?select=id,prompt_text,prompt_key,provider,model,answer_text,citations_json,review_status,collected_at&run_id=eq.${share.run_id}&organization_id=eq.${share.organization_id}&order=collected_at.asc&limit=200`, { serviceRole: true }),
  ]);
  const run = runs[0];
  if (!run) notFound();
  const reviewed = answers.filter((answer) => answer.review_status === "verified").length;
  const safeConclusion = ["complete", "partial"].includes(run.status) && reviewed > 0;

  return <main className="shared-record-shell">
    <header className="shared-record-header"><Wordmark /><span>Read-only stakeholder view</span></header>
    <section className="shared-record-hero">
      <div><span className="eyebrow">Recommendation Record · {run.id.slice(0, 8).toUpperCase()}</span><h1>Evidence that can be challenged.</h1><p>This shared view is frozen to one recorded collection. It does not expose workspace navigation, private notes, credentials, or unrelated customer data.</p></div>
      <dl><div><dt>Observed</dt><dd>{run.answer_count} answers</dd></div><div><dt>Returned</dt><dd>{run.citation_count} citation observations</dd></div><div><dt>Reviewed</dt><dd>{reviewed} answers</dd></div><div><dt>Safe conclusion</dt><dd>{safeConclusion ? "Available" : "Withheld"}</dd></div></dl>
    </section>
    <section className="shared-evidence-chain" aria-label="Evidence state"><span>Returned</span><span>Retrieved</span><span>Observed</span><span>Reviewed</span><strong>Safe conclusion</strong></section>
    <section className="shared-record-list">
      {answers.map((answer) => <article key={answer.id}>
        <div className="shared-record-list__meta"><span>{answer.provider}{answer.model ? ` · ${answer.model}` : ""}</span><span>{answer.review_status === "verified" ? "Reviewed" : answer.review_status === "excluded" ? "Excluded" : "Unreviewed"}</span></div>
        <h2>{answer.prompt_text || answer.prompt_key}</h2>
        <p>{answer.answer_text}</p>
        {share.include_evidence && Array.isArray(answer.citations_json) && answer.citations_json.length > 0 && <details><summary>Returned references ({answer.citations_json.length})</summary><ul>{answer.citations_json.map((citation, index) => <li key={`${citation.url || "reference"}-${index}`}>{citation.title || citation.url || `Returned reference ${index + 1}`}{citation.url && <small>{citation.url}</small>}</li>)}</ul><p className="table-caption">A returned reference is evidence of what the provider returned. It does not prove the source caused the recommendation.</p></details>}
      </article>)}
    </section>
    <footer className="shared-record-footer"><p>Methodology {run.methodology_version} · Collection {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(run.completed_at || run.created_at))}</p><p>Foremention separates provider output, returned references, observed evidence, human review, and conclusions.</p></footer>
  </main>;
}
