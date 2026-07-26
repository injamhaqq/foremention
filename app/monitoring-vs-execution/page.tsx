import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "AI Visibility Monitoring vs Source Intelligence", description: "Compare basic AI mention monitoring with Foremention source mapping, evidence review, reliability checks, customer-owned actions, and dated change tracking.", path: "/monitoring-vs-execution" });

const rows = [
  ["Buyer-question and mention tracking", "Yes", "Yes"],
  ["Exact third-party URL map", "Varies", "Core deliverable"],
  ["Competitor presence on each page", "Varies", "Required"],
  ["Legitimate route into each source", "Recommendations", "Structured workflow"],
  ["Evidence and action workspace", "Usually limited", "Included"],
  ["Publication → indexing → citation trail", "Varies", "URL-level record"],
  ["Guaranteed ranking or citation", "No credible tool can", "No"],
];

export default function MonitoringVsExecutionPage() {
  return <PublicShell><section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Monitoring vs intelligence</span><h1>Monitoring shows the mention. Foremention maps what shaped it.</h1><p>Most monitoring tools report where a brand appeared. Foremention is self-serve infrastructure for connecting the buyer question, AI answer, exact outside source, competitor gap, next action, and later change.</p></div></section><section className="section section--paper"><div className="shell comparison-table"><div className="comparison-row comparison-row--head"><span>Capability</span><span>Monitoring software</span><span>Foremention</span></div>{rows.map(row => <div className="comparison-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span></div>)}</div><div className="shell routing-note"><div><span className="eyebrow">Use basic monitoring when</span><p>You only need mention counts, visibility snapshots, and periodic alerts.</p></div><div><span className="eyebrow">Use Foremention when</span><p>Your team needs exact-source intelligence, customer-owned workflows, evidence requirements, action tracking, and an honest publication-to-citation record.</p></div></div></section><section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">See the gap first</span><h2>Find the outside pages deciding the answer.</h2></div><Link className="button button--ink button--large" href="/source-gap">Run the free check <Arrow /></Link></div></section></PublicShell>;
}
