import Link from "next/link";
import { ChangeSpecificationDetail } from "@/components/change-specification-detail";
import { DecisionIntelligenceContext } from "@/components/decision-intelligence-context";
import { NextBestChangeContext } from "@/components/next-best-change-context";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole } from "@/lib/data";

export default async function ChangeSpecificationPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer("/app");
  const [{ id }, role] = await Promise.all([params, getPrimaryWorkspaceRole(viewer)]);

  return <main className="workspace">
    <div className="workspace-heading">
      <div><span className="eyebrow">Recommendation Engineering</span><h1>Change Specification</h1><p>Inspect the evidence-backed company decision, define the exact customer-owned change, and preserve the human approval boundary before any execution asset is created.</p></div>
      <Link className="button button--outline" href="/app">Back to Attention</Link>
    </div>
    <ChangeSpecificationDetail id={id} demo={viewer.mode === "demo"} role={role || "viewer"} />
    <DecisionIntelligenceContext changeSpecificationId={id} />
    <NextBestChangeContext changeSpecificationId={id} />
  </main>;
}
