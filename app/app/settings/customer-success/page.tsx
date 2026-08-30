import Link from "next/link";
import { CustomerSuccessSettings } from "@/components/customer-success-settings";
import { requireViewer } from "@/lib/auth";

export default async function CustomerSuccessPage() {
  const viewer = await requireViewer("/app/settings/customer-success");
  return <main className="workspace">
    <div className="workspace-heading">
      <div><span className="eyebrow">Settings · Customer Success</span><h1>Customer outcome plan</h1><p>Keep onboarding, account goals, customer roles, adoption, health, renewal, QBRs, expansion, advocacy, and notification controls beside the Outcome Ledger without turning Foremention into project-management software.</p></div>
      <div className="workspace-heading__actions"><Link className="button button--outline" href="/app/settings">Back to Settings</Link><Link className="button button--ink" href="/app/outcomes">Open Outcome Ledger</Link></div>
    </div>
    <section className="panel outcome-ledger__boundary"><strong>Customer truth boundary</strong><p>No customer, sponsor, health score, renewal risk, QBR result, expansion opportunity, advocacy state, or economic value is created automatically. Scored states require a written basis; manual reviews remain operational evidence and do not become dollar ROI.</p></section>
    <CustomerSuccessSettings demo={viewer.mode === "demo"} />
  </main>;
}
