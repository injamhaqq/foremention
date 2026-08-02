import Link from "next/link";
import { ClaimLedger } from "@/components/claim-ledger";
import { EvidenceManager } from "@/components/evidence-manager";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadEvidence, loadLatestReviewedAnswers, loadVerifiedClaims } from "@/lib/data";

export default async function EvidencePage() {
  const viewer = await requireViewer("/app/evidence");
  const [evidence, collected, claims, role] = await Promise.all([loadEvidence(viewer), loadLatestReviewedAnswers(viewer, 12), loadVerifiedClaims(viewer), getPrimaryWorkspaceRole(viewer)]);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Claim readiness</span><h1>Evidence Vault</h1><p>Store the dated proof behind company facts, customer results, security, integrations, pricing, and research. Nothing is treated as verified simply because it was uploaded.</p></div></div>
    <section className="panel collected-evidence"><div className="panel-heading"><div><span className="eyebrow">Collected AI evidence</span><h2>{collected.length} verified answer{collected.length === 1 ? "" : "s"} in this workspace.</h2></div></div>{collected.length ? <div>{collected.map((answer) => <article key={answer.id}><div><strong>{answer.prompt}</strong><small>{answer.provider}{answer.model ? ` · ${answer.model}` : ""} · {answer.collectedAt}</small></div><span>{answer.citations.length} cited source{answer.citations.length === 1 ? "" : "s"}</span></article>)}</div> : <div className="empty-state empty-state--compact"><h2>No reviewed provider evidence yet.</h2><p>Verified provider answers will appear here after a run is reviewed. They remain separate from uploaded company-claim evidence.</p><Link className="text-link" href="/app/runs">Open Answer Runs →</Link></div>}</section>
    <div className="section-label"><span className="eyebrow">Company claim evidence</span><p>Manually supplied facts, rights, and supporting documents.</p></div>
    <section className="panel panel--flush"><EvidenceManager initialItems={evidence} demo={viewer.mode === "demo"} canReview={viewer.mode !== "demo" && role !== "viewer"} /></section>
    <ClaimLedger evidence={evidence} initialClaims={claims} demo={viewer.mode === "demo"} canManage={viewer.mode === "demo" || role !== "viewer"} />
    <div className="evidence-note"><strong>Evidence rule</strong><p>Unverified or expired items remain excluded from public claims and source outreach until a named owner reviews their source, limitations, rights, and date.</p></div>
  </main>;
}
