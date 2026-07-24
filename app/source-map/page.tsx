import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { PublicSourceMapExplorer } from "@/components/public-source-map-explorer";
import { sourceMapEntries } from "@/lib/demo-data";

export const metadata = { title: "Source Map" };

export default function SourceMapProductPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Source Map</span><h1>Turn category evidence into a connected record.</h1><p>Source Map records the page, the brands it supports, the evidence signal, and the next action your team can evaluate.</p></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Product preview</span><h2>Explore the Source Map interface.</h2><p>The records below illustrate the fields Foremention keeps together: source evidence, brand presence, and a dated action path.</p></div><PublicSourceMapExplorer entries={sourceMapEntries} /></div></section>
    <section className="section section--ink"><div className="shell split-section"><div><span className="eyebrow eyebrow--on-ink">One connected record</span><h2>From buyer question to business signal.</h2></div><ol className="chain-list"><li>Buyer question</li><li>AI answer</li><li>Exact outside page</li><li>Brand presence</li><li>Evidence review</li><li>Movement watch</li><li>Referral and pipeline evidence</li></ol></div></section>
    <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">Start with your category</span><h2>Build a source record your team can use.</h2></div><Link className="button button--ink button--large" href="/signup">Create workspace <Arrow /></Link></div></section>
  </PublicShell>;
}
