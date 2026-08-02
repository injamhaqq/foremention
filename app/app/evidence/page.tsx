import Link from "next/link";
import { LazyClaimLedger, LazyEvidenceManager } from "@/components/lazy-workspace-panels";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadEvidence, loadLatestReviewedAnswers, loadVerifiedClaims } from "@/lib/data";

export default async function EvidencePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await requireViewer("/app/evidence");
  const { page: requestedPage } = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(requestedPage || "1", 10) || 1));
  const pageSize = 20;
  const [evidencePage, collected, claims, role] = await Promise.all([loadEvidence(viewer, { limit: pageSize + 1, offset: (page - 1) * pageSize }), loadLatestReviewedAnswers(viewer, 12), loadVerifiedClaims(viewer), getPrimaryWorkspaceRole(viewer)]);
  const hasNext = evidencePage.length > pageSize;
  const evidence = evidencePage.slice(0, pageSize);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Claim readiness</span><h1>Evidence Vault</h1><p>Store the dated proof behind company facts, customer results, security, integrations, pricing, and research. Nothing is treated as verified simply because it was uploaded.</p></div></div>
    <section className="panel collected-evidence"><div className="panel-heading"><div><span className="eyebrow">Collected AI evidence</span><h2>{collected.length} verified answer{collected.length === 1 ? "" : "s"} in this workspace.</h2></div></div>{collected.length ? <div>{collected.map((answer) => <article key={answer.id}><div><strong>{answer.prompt}</strong><small>{answer.provider}{answer.model ? ` · ${answer.model}` : ""} · {answer.collectedAt}</small></div><span>{answer.citations.length} cited source{answer.citations.length === 1 ? "" : "s"}</span></article>)}</div> : <div className="empty-state empty-state--compact"><h2>No reviewed provider evidence yet.</h2><p>Verified provider answers will appear here after a run is reviewed. They remain separate from uploaded company-claim evidence.</p><Link className="text-link" href="/app/runs">Open Answer Runs →</Link></div>}</section>
    <div className="section-label"><span className="eyebrow">Company claim evidence</span><p>Manually supplied facts, rights, and supporting documents.</p></div>
    <section className="panel panel--flush"><LazyEvidenceManager initialItems={evidence} demo={viewer.mode === "demo"} canReview={viewer.mode !== "demo" && role !== "viewer"} /></section>
    {(page > 1 || hasNext) && <nav className="workspace-pagination" aria-label="Evidence pages"><Link aria-disabled={page === 1} href={page === 1 ? "#" : `/app/evidence?page=${page - 1}`}>Previous</Link><span>Evidence page {page}</span><Link aria-disabled={!hasNext} href={hasNext ? `/app/evidence?page=${page + 1}` : "#"}>Next</Link></nav>}
    <LazyClaimLedger evidence={evidence} initialClaims={claims} demo={viewer.mode === "demo"} canManage={viewer.mode === "demo" || role !== "viewer"} />
    <div className="evidence-note"><strong>Evidence rule</strong><p>Unverified or expired items remain excluded from public claims and source outreach until a named owner reviews their source, limitations, rights, and date.</p></div>
  </main>;
}
