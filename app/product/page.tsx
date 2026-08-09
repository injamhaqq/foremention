import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "AI Visibility Platform with Source Intelligence", description: "Explore Foremention Intelligence Loop, Source X-Ray, Source Map, Resolution Center, evidence review, buyer-question monitoring, and action-linked measurement.", path: "/product" });

const systems = [
  ["01", "Source X-Ray", "Connects an answer record to the citation URLs returned with it and the brands named in the answer."],
  ["02", "Source Map", "Organizes recurring source pages, brand presence, evidence signals, and actions in one category record."],
  ["03", "Evidence Vault + Claim Integrity Ledger", "Connects approved wording and explicit limitations to verified evidence, usage rights, an owner, and a dated audit trail."],
  ["04", "Action Graph", "Turns an evidence gap into a structured decision, owner, next action, and dated outcome."],
  ["05", "Movement Watch", "Tracks answer changes, source changes, citation survival, and competitor movement over time."],
  ["06", "Resolution Center", "Turns a reviewed problem into a customer-owned solution asset, approval record, applied location, and comparable follow-up measurement."],
  ["07", "Agent Control Plane", "Shows the recorded state and evidence boundary of each collection, mapping, measurement, and human-review stage."],
  ["08", "Intelligence Loop", "Searches reviewed evidence, compares runs, explains change, confidence, and cost, then routes one deterministic next action."],
];

export default function ProductPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">The platform</span><h1>See how your company appears—and what was returned with the answer.</h1><p>Foremention records whether your brand appears, which competitors appear instead, and the citation URLs returned with each dated AI answer. When a provider returns no citations, that absence remains visible rather than becoming invented evidence.</p><div className="page-hero__actions"><Link className="button" href="#source-xray">See Source X-Ray <Arrow /></Link><Link className="text-link text-link--inverse" href="/pricing">View Foremention plans <Arrow /></Link></div></div></section>
    <section className="goat-xray-section goat-xray-section--product"><div className="shell"><SourceXRayExperience /></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Eight connected systems</span><h2>One platform from answer record to approved change.</h2><p>Connect a brand, define buyer questions, collect evidence, inspect returned citations, create an evidence-bound solution, approve it, and measure the same conditions again.</p></div><div className="system-grid">{systems.map(([n,title,body]) => <article key={n}><span>{n}</span><h2>{title}</h2><p>{body}</p></article>)}</div></div></section>
    <section className="section section--yellow"><div className="shell metric-layers"><div><span className="eyebrow">The Recommendation Graph</span><h2>Every completed run adds a dated record to your company&apos;s recommendation data layer.</h2></div><div><h3>Question</h3><p>What did the buyer ask, on which engine, at what time?</p></div><div><h3>Source</h3><p>Which outside URLs did the provider return, and which brands did the answer name?</p></div><div><h3>Change</h3><p>What moved across comparable later runs, which evidence survived, and where should the team review next?</p></div></div></section>
    <section className="section section--ink"><div className="shell split-section"><div><span className="eyebrow eyebrow--on-ink">Built for trust</span><h2>Observed answers. Returned citations. Raw records kept.</h2></div><div className="truth-list"><div><span>01</span><p><strong>Every engine stays separate.</strong> One provider changing does not erase the rest of the evidence.</p></div><div><span>02</span><p><strong>Every changed question gets a new record.</strong> Old and new results remain understandable.</p></div><div><span>03</span><p><strong>Missing data stays visible.</strong> A failed check or citation-free answer never becomes a made-up score.</p></div></div></div></section>
    <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">Start self-serve</span><h2>Build the recommendation intelligence layer for your category.</h2></div><Link className="button button--ink button--large" href="/signup">Create workspace <Arrow /></Link></div></section>
  </PublicShell>;
}
