import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

const comparisons = {
  "monitoring-tools": { label: "AI monitoring tools", intro: "Monitoring tools tell you where a brand appeared. Foremention connects that observation to the outside pages that shaped the answer and a customer-owned action workflow.", rows: [["Buyer-question monitoring", "Core", "Included"], ["Third-party URL map", "Often a report or export", "Core Source Map"], ["Entry-route feasibility", "Usually recommendations", "Structured workflow"], ["Evidence and action workspace", "Usually limited", "Included"], ["Outcome guarantees", "No", "No"]] },
  "geo-agencies": { label: "GEO agencies", intro: "Many GEO engagements focus on consulting and owned-site changes. Foremention is customer-operated software for exact-source intelligence, evidence management, and change tracking.", rows: [["Owned-site optimization", "Often the center", "Supporting layer"], ["Source Map", "Varies", "Core product"], ["Customer-operated workflow", "Usually no", "Core product"], ["URL-level citation trail", "Varies", "Required"], ["Outcome guarantees", "Should be no", "No"]] },
  "pr-agencies": { label: "traditional PR agencies", intro: "PR can create valuable coverage. Foremention adds buyer-question source intelligence and tracks whether a published URL later appears in relevant AI answers.", rows: [["Editorial relationships", "Core strength", "Route-dependent"], ["Answer evidence", "Usually outside scope", "Core"], ["Citation tracking", "Varies", "URL-level"], ["Broad brand awareness", "Core", "Not the primary claim"], ["Outcome guarantees", "No", "No"]] },
} as const;

export function generateStaticParams() { return Object.keys(comparisons).map((competitor) => ({ competitor })); }

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params; const item = comparisons[competitor as keyof typeof comparisons];
  return item ? pageMetadata({
    title: `Foremention vs ${item.label}`,
    description: item.intro,
    path: `/compare/${competitor}`,
  }) : {};
}

export default async function ComparePage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params; const item = comparisons[competitor as keyof typeof comparisons]; if (!item) notFound();
  return <PublicShell><section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Comparison</span><h1>Foremention vs {item.label}</h1><p>{item.intro}</p></div></section><section className="section section--paper"><div className="shell comparison-table"><div className="comparison-row comparison-row--head"><span>Capability</span><span>{item.label}</span><span>Foremention</span></div>{item.rows.map((row) => <div className="comparison-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span></div>)}</div><div className="shell comparison-links"><Link href="/compare/monitoring-tools">Monitoring tools</Link><Link href="/compare/geo-agencies">GEO agencies</Link><Link href="/compare/pr-agencies">PR agencies</Link><Link className="button button--ink" href="/source-gap">Check your source gap <Arrow /></Link></div></section></PublicShell>;
}
