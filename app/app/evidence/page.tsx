import Link from "next/link";
import { StatusDot } from "@/components/brand";
import { requireViewer } from "@/lib/auth";

const evidence = [
  ["Company description", "Northstar HR helps distributed teams manage people operations.", "Verified", "Jul 18, 2026"],
  ["Customer result", "Reduced onboarding administration by 32% for SampleCo.", "Needs source", "—"],
  ["Integration", "Native connection with HubSpot", "Verified", "Jul 12, 2026"],
  ["Security", "SOC 2 Type II", "Expired", "Mar 31, 2026"],
  ["Pricing", "Plans begin at $79 per employee / month", "Verified", "Jul 20, 2026"],
];

export default async function EvidencePage() {
  const viewer = await requireViewer("/app/evidence");
  const live = viewer.mode !== "demo";
  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div><span className="eyebrow">Claim readiness</span><h1>Evidence Vault</h1><p>Every usable claim has an owner, supporting source, verification date, usage boundary, and visible limitation.</p></div>
        <Link className="button button--ink" href="/app/settings#evidence-import">Set up evidence intake →</Link>
      </div>
      {live ? <section className="panel empty-state empty-state--border"><h2>No workspace evidence has been entered.</h2><p>Live evidence records will appear only after they include an owner, source, verification date, limitations, and usage boundary.</p></section> : <><div className="evidence-summary"><div><strong>3</strong><span>verified claims</span></div><div><strong>1</strong><span>needs evidence</span></div><div><strong>1</strong><span>expired item</span></div><div><strong>60%</strong><span>readiness coverage</span></div></div><section className="panel panel--flush"><div className="evidence-table"><div className="evidence-row evidence-row--head"><span>Claim</span><span>Approved wording</span><span>Status</span><span>Verified</span></div>{evidence.map(([name, wording, status, date]) => <div className="evidence-row" key={name}><strong>{name}</strong><p>{wording}</p><span className="presence-cell"><StatusDot tone={status === "Verified" ? "green" : status === "Expired" ? "red" : "yellow"} />{status}</span><span>{date}</span></div>)}</div></section></>}
      <div className="evidence-note"><strong>Evidence rule</strong><p>Unsupported claims are excluded from outreach. Expired evidence must be re-verified before it returns to an approved pitch.</p><small>{viewer.mode === "demo" ? "Fictional demo records. Changes are intentionally disabled." : "Live evidence writes require an approved project, owner, and source record."}</small></div>
    </main>
  );
}
