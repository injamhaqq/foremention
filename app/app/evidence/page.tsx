import { EvidenceManager } from "@/components/evidence-manager";
import { requireViewer } from "@/lib/auth";
import { loadEvidence } from "@/lib/data";

export default async function EvidencePage() {
  const viewer = await requireViewer("/app/evidence");
  const evidence = await loadEvidence(viewer);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Claim readiness</span><h1>Evidence Vault</h1><p>Store the dated proof behind company facts, customer results, security, integrations, pricing, and research. Nothing is treated as verified simply because it was uploaded.</p></div></div>
    <section className="panel panel--flush"><EvidenceManager initialItems={evidence} demo={viewer.mode === "demo"} /></section>
    <div className="evidence-note"><strong>Evidence rule</strong><p>Unverified or expired items remain excluded from public claims and source outreach until a named owner reviews their source, limitations, rights, and date.</p></div>
  </main>;
}
