import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Teardowns", description: "Reproducible Foremention category teardowns and their publication standard." };

const rules = [
  ["01", "Name the buyer questions", "The category, exact wording, AI tool, date, geography, and repetition count are published."],
  ["02", "Show the receipts", "Every recommendation and cited URL stays attached to the answer evidence that produced it."],
  ["03", "Separate fact from judgment", "Observed presence is evidence. Influence and placement feasibility are labelled analysis."],
  ["04", "Publish the limitation", "No single run becomes a market trend, and no missing citation is treated as proof of causation."],
];

export default function TeardownsPage() {
  return <PublicShell><section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Public teardowns</span><h1>A track record you can reproduce on your own screen.</h1><p>Foremention publishes category evidence, not rage bait. A teardown ships only when the complete run record and its limitations can be shown.</p></div></section><section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Publication standard</span><h2>Four rules before a result goes public.</h2></div><div className="process-grid">{rules.map(([n,title,body]) => <article className="process-card" key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section><section className="section section--yellow"><div className="shell teardown-proof"><div><span className="eyebrow eyebrow--dark">No placeholder proof</span><h2>No customer score appears here until a real, reproducible run exists.</h2><p>The sample report is explicitly fictional and demonstrates structure only. Public teardowns will use named evidence, dated observations, and a linked method.</p></div><Link className="button button--ink" href="/sample-report">Inspect the fictional sample <Arrow /></Link></div></section><section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">Use your category</span><h2>Start with a private Source Gap Check.</h2></div><Link className="button button--ink button--large" href="/source-gap">Check your sources <Arrow /></Link></div></section></PublicShell>;
}
