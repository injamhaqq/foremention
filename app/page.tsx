import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { MissingAnswerExperience, SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { VerifiedSocialProof } from "@/components/verified-social-proof";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility and Recommendation Intelligence Platform",
  description:
    "Track buyer questions, AI answer visibility, returned citation URLs, competitor presence, evidence reliability, and change over time in one customer-operated platform.",
  path: "/",
});

const faq = [
  { q: "What does Foremention do?", a: "Foremention turns the buyer questions that matter in your category into a dated record of AI answers, named brands, source pages, and movement over time." },
  { q: "What is a Source Map?", a: "A Source Map is your category’s evidence layer: citation URLs returned by providers, the brands found during review, and where your brand may be absent." },
  { q: "What is the Recommendation Graph?", a: "It connects a buyer question to an observed answer, returned citations, competitor presence, a reviewed action, and later comparable evidence." },
  { q: "Who is it for?", a: "Marketing, product, growth, and strategy teams that need a shared record of which brands appeared and which citations were returned for important category questions." },
  { q: "Does Foremention guarantee an AI recommendation?", a: "No. AI answers and publisher decisions change. Foremention makes the evidence, uncertainty, and movement visible; it does not guarantee rankings, citations, traffic, or revenue." },
  { q: "How does platform access work?", a: "Create a workspace, set your category and buyer questions, then use the platform to collect, inspect, and compare dated observations as capacity is activated." },
];

const capabilities = [
  { n: "01", title: "Add your company", body: "Define the category, market, brand, and competitors you want to understand." },
  { n: "02", title: "Choose buyer questions", body: "Use the real questions buyers ask when comparing products in your category." },
  { n: "03", title: "Collect dated answers", body: "Run approved questions against connected AI providers and preserve every result." },
  { n: "04", title: "Review sources and gaps", body: "See brand presence, competitors, cited pages, and the next evidence gap worth reviewing." },
];

export default function HomePage() {
  const structuredData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return <PublicShell>
    <section className="goat-hero"><MissingAnswerExperience /></section>
    <section className="goat-proof-strip" aria-label="Foremention product standard"><div className="shell"><div><strong>DATED</strong><span>Every observation has a time</span></div><div><strong>EXACT</strong><span>Source evidence stays visible</span></div><div><strong>SHARED</strong><span>Your team owns the workspace</span></div><div><strong>CLEAR</strong><span>Limits stay in the product</span></div></div></section>
    <section className="platform-section" id="how-it-works"><div className="shell"><div className="platform-heading"><span className="goat-kicker">How it works</span><h2>From company setup to inspectable evidence in four steps.</h2><p>Foremention turns your category and buyer questions into dated answer records, competitor observations, returned citation URLs, and reviewable next actions.</p></div><div className="platform-steps">{capabilities.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div></section>
    <section className="goat-xray-section"><div className="shell"><SourceXRayExperience /></div></section>
    <section className="platform-value-section"><div className="shell platform-value-grid"><div><span className="goat-kicker">One workspace, not another report</span><h2>From question to source to change.</h2><p>The Recommendation Graph is a living record of buyer questions, observed answers, returned citation URLs, competitors, actions, and the evidence that changes afterward.</p><Link className="button button--ink button--large" href="/signup">Create your workspace <Arrow /></Link></div><div className="platform-ledger"><div><span>Monitor</span><strong>Buyer questions across connected AI engines</strong></div><div><span>Explain</span><strong>Returned URLs and competitor presence in answer records</strong></div><div><span>Prioritize</span><strong>Evidence gaps by context and next action</strong></div><div><span>Measure</span><strong>Movement over time without pretending causation</strong></div></div></div></section>
    <section className="home-pricing-section" id="pricing"><div className="shell"><div className="platform-heading"><span className="goat-kicker">Foremention plans</span><h2>Infrastructure your team can grow into.</h2><p>Start with one category, then add questions, brands, collection capacity, history, and integration scope as the intelligence layer becomes part of your operating system.</p></div><div className="home-pricing-grid"><article><span>Core</span><strong>$149<small>/month</small></strong><p>One category, monthly collection capacity, a durable Source Map, and an evidence-review workflow.</p><Link href="/pricing">Explore Core <Arrow /></Link></article><article className="is-featured"><span>Signal</span><strong>$499<small>/month</small></strong><p><b>Everything in Core, plus</b> weekly collection capacity, cross-provider agreement, priority gaps, and team review workflow.</p><Link href="/pricing">Explore Signal <Arrow /></Link></article><article><span>Intelligence</span><strong>Scale<small> with your category</small></strong><p><b>Everything in Signal, plus</b> multi-brand monitoring, deeper history, tailored capacity, and a confirmed API and integration scope.</p><Link href="/pricing">View platform plans <Arrow /></Link></article></div></div></section>
    <section className="trust-band"><div className="shell trust-band-grid"><div><span className="goat-kicker goat-kicker--light">Trust is a product feature</span><h2>Evidence, limits, and uncertainty stay visible.</h2></div><div><p>Foremention records what was observed. No fake reviews. No hidden promotion. No ranking guarantees.</p><Link className="button button--large" href="/honesty">Read our standards <Arrow /></Link></div></div></section>
    <VerifiedSocialProof />
    <section className="goat-faq-section"><div className="shell goat-faq-grid"><div><span className="goat-kicker">Clear answers</span><h2>Understand it in five minutes.</h2></div><div>{faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></div></section>
    <section className="goat-final-cta"><div className="shell"><span>Build the intelligence layer</span><h2>See what is shaping your category in AI.</h2><Link className="button button--ink button--large" href="/signup">Create your workspace <Arrow /></Link><p>Questions, answers, sources, competitors, and change—connected in one platform.</p></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
  </PublicShell>;
}
