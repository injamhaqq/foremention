import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "AI Visibility Platform with Source Intelligence", description: "Explore Foremention Intelligence Loop, Source X-Ray, Source Map, Agent Control Plane, Decision Lab, evidence review, buyer-question monitoring, and action tracking.", path: "/product" });

const systems = [
  ["01", "Source X-Ray", "Connects an answer record to the outside pages and brands that help explain it."],
  ["02", "Source Map", "Organizes recurring source pages, brand presence, evidence signals, and actions in one category record."],
  ["03", "Evidence Vault + Claim Integrity Ledger", "Connects approved wording and explicit limitations to verified evidence, usage rights, an owner, and a dated audit trail."],
  ["04", "Action Graph", "Turns an evidence gap into a structured decision, owner, next action, and dated outcome."],
  ["05", "Movement Watch", "Tracks answer changes, source changes, citation survival, and competitor movement over time."],
  ["06", "Revenue Lens", "Connects observed AI referrals and self-reported discovery to leads and pipeline without claiming false causation."],
  ["07", "Agent Control Plane", "Shows the recorded state and evidence boundary of each collection, mapping, measurement, and human-review stage."],
  ["08", "Intelligence Loop", "Searches reviewed evidence, compares runs, explains change, confidence, and cost, then routes one deterministic next action."],
];

export default function ProductPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">The platform</span><h1>See what the answer is built on.</h1><p>Source X-Ray connects an answer to its underlying evidence. Source Map turns that evidence into a category record your team can inspect, prioritize, and revisit.</p><div className="page-hero__actions"><Link className="button" href="#source-xray">See Source X-Ray <Arrow /></Link><Link className="text-link text-link--inverse" href="/pricing">View platform plans <Arrow /></Link></div></div></section>
    <section className="goat-xray-section goat-xray-section--product"><div className="shell"><SourceXRayExperience /></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><span className="eyebrow">Eight connected systems</span><h2>One platform from answer record to measurable change.</h2><p>Connect a brand, define buyer questions, collect evidence, inspect exact sources, prioritize decisions, and track what changes in your own workspace.</p></div><div className="system-grid">{systems.map(([n,title,body]) => <article key={n}><span>{n}</span><h2>{title}</h2><p>{body}</p></article>)}</div></div></section>
    <section className="section section--yellow"><div className="shell metric-layers"><div><span className="eyebrow">The Recommendation Graph</span><h2>Every run strengthens your company&apos;s recommendation data layer.</h2></div><div><h3>Question</h3><p>What did the buyer ask, on which engine, at what time?</p></div><div><h3>Source</h3><p>Which exact outside URL supported the answer, and who did it name?</p></div><div><h3>Change</h3><p>What moved across later runs, which evidence survived, and where should the team act next?</p></div></div></section>
    <section className="section section--ink"><div className="shell split-section"><div><span className="eyebrow eyebrow--on-ink">Built for trust</span><h2>Real answers. Exact pages. Raw evidence kept.</h2></div><div className="truth-list"><div><span>01</span><p><strong>Every engine stays separate.</strong> One provider changing does not erase the rest of the evidence.</p></div><div><span>02</span><p><strong>Every changed question gets a new record.</strong> Old and new results remain understandable.</p></div><div><span>03</span><p><strong>Missing data stays visible.</strong> A failed check never becomes a made-up score.</p></div></div></div></section>
    <section className="cta-band"><div className="shell cta-band__inner"><div><span className="eyebrow">Start self-serve</span><h2>Build the recommendation intelligence layer for your category.</h2></div><Link className="button button--ink button--large" href="/signup">Create workspace <Arrow /></Link></div></section>
  </PublicShell>;
}
