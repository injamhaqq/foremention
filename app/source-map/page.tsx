import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { PublicSourceMapExplorer } from "@/components/public-source-map-explorer";
import { sourceMapEntries } from "@/lib/demo-data";

export const metadata = { title: "Source Map product" };

export default function SourceMapProductPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">After the X-Ray</span><h1>Turn every hidden source into a clear next move.</h1><p>The Source Map records the exact page, who it supports, whether your brand appears, how strong the opportunity is, and the fair route for earning inclusion.</p></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Interactive sample</span><h2>Explore a fictional category map.</h2><p>Filter the evidence below. Every source is sample data; the workflow and fields match the production product.</p></div><PublicSourceMapExplorer entries={sourceMapEntries} /></div></section>
    <section className="section section--ink"><div className="shell split-section"><div><span className="eyebrow eyebrow--on-ink">One connected record</span><h2>From buyer question to business signal.</h2></div><ol className="chain-list"><li>Buyer question</li><li>AI answer</li><li>Exact outside page</li><li>Competitor gap</li><li>Fair route in</li><li>Publication and citation watch</li><li>Referral and pipeline evidence</li></ol></div></section>
    <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">Start with your category</span><h2>See which sources shape the shortlist.</h2></div><Link className="button button--ink button--large" href="/source-gap">Run the free check <Arrow /></Link></div></section>
  </PublicShell>;
}
