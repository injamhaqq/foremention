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
    "Track buyer questions, AI answer visibility, exact source pages, competitor presence, evidence reliability, and change over time in one customer-operated platform.",
  path: "/",
});

const faq = [
  { q: "What does Foremention do?", a: "Foremention turns the buyer questions that matter in your category into a dated record of AI answers, named brands, source pages, and movement over time." },
  { q: "What is a Source Map?", a: "A Source Map is your category’s evidence layer: the pages that support recommendations, which brands they mention, and where your brand is missing." },
  { q: "What is the Recommendation Graph?", a: "It connects a buyer question to an observed answer, the supporting sources, competitor presence, an action, and the later change in evidence." },
  { q: "Who is it for?", a: "Marketing, product, growth, and strategy teams that need a shared answer to a simple question: why do AI systems recommend those brands?" },
  { q: "Does Foremention guarantee an AI recommendation?", a: "No. AI answers and publisher decisions change. Foremention makes the evidence, uncertainty, and movement visible; it does not guarantee rankings, citations, traffic, or revenue." },
  { q: "How does platform access work?", a: "Create a workspace, set your category and buyer questions, then use the platform to collect, inspect, and compare dated observations as capacity is activated." },
];

const capabilities = [
  { n: "01", title: "Collect", body: "Turn the questions that shape purchase decisions into an organized monitoring system." },
  { n: "02", title: "Explain", body: "Connect answers to the exact source pages and brands visible behind them." },
  { n: "03", title: "Decide", body: "Prioritize the evidence gaps worth acting on and track the movement that follows." },
];

export default function HomePage() {
  const structuredData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return <PublicShell>
    <section className="goat-hero"><MissingAnswerExperience /></section>
    <section className="goat-proof-strip" aria-label="Foremention product standard"><div className="shell"><div><strong>DATED</strong><span>Every observation has a time</span></div><div><strong>EXACT</strong><span>Source evidence stays visible</span></div><div><strong>SHARED</strong><span>Your team owns the workspace</span></div><div><strong>CLEAR</strong><span>Limits stay in the product</span></div></div></section>
    <section className="platform-section" id="how-it-works"><div className="shell"><div className="platform-heading"><span className="goat-kicker">Recommendation intelligence, made practical</span><h2>Understand what shapes the AI shortlist.</h2><p>Foremention gives your team a durable system for investigating the answers buyers see—without turning uncertainty into a promise.</p></div><div className="platform-steps">{capabilities.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div></section>
    <section className="goat-xray-section"><div className="shell"><SourceXRayExperience /></div></section>
    <section className="platform-value-section"><div className="shell platform-value-grid"><div><span className="goat-kicker">One workspace, not another report</span><h2>From question to source to change.</h2><p>The Recommendation Graph is a living record of buyer questions, observed answers, source pages, competitors, actions, and the evidence that changes afterward.</p><Link className="button button--ink button--large" href="/signup">Create your workspace <Arrow /></Link></div><div className="platform-ledger"><div><span>Monitor</span><strong>Buyer questions across connected AI engines</strong></div><div><span>Explain</span><strong>Exact URLs and competitor presence behind answers</strong></div><div><span>Prioritize</span><strong>Evidence gaps by context and next action</strong></div><div><span>Measure</span><strong>Movement over time without pretending causation</strong></div></div></div></section>
    <section className="home-pricing-section" id="pricing"><div className="shell"><div className="platform-heading"><span className="goat-kicker">Built to compound</span><h2>Infrastructure your team can grow into.</h2><p>Start with one category, then add questions, brands, collection capacity, history, and integrations as the intelligence layer becomes part of your operating system.</p></div><div className="home-pricing-grid"><article><span>Core</span><strong>$149<small>/month</small></strong><p>One category, monthly reviewed collection, a durable Source Map, and reliability checks.</p><Link href="/pricing">Explore Core <Arrow /></Link></article><article className="is-featured"><span>Signal</span><strong>$499<small>/month</small></strong><p>Weekly collection, cross-provider agreement, priority gaps, and team workflow.</p><Link href="/pricing">Explore Signal <Arrow /></Link></article><article><span>Intelligence</span><strong>Scale<small> with your category</small></strong><p>Multi-brand monitoring, deeper history, tailored capacity, API access, and controls.</p><Link href="/pricing">View platform plans <Arrow /></Link></article></div></div></section>
    <section className="trust-band"><div className="shell trust-band-grid"><div><span className="goat-kicker goat-kicker--light">Trust is a product feature</span><h2>Evidence, limits, and uncertainty stay visible.</h2></div><div><p>Foremention records what was observed. No fake reviews. No hidden promotion. No ranking guarantees.</p><Link className="button button--large" href="/honesty">Read our standards <Arrow /></Link></div></div></section>
    <VerifiedSocialProof />
    <section className="goat-faq-section"><div className="shell goat-faq-grid"><div><span className="goat-kicker">Clear answers</span><h2>Understand it in five minutes.</h2></div><div>{faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></div></section>
    <section className="goat-final-cta"><div className="shell"><span>Build the intelligence layer</span><h2>See what is shaping your category in AI.</h2><Link className="button button--ink button--large" href="/signup">Create your workspace <Arrow /></Link><p>Questions, answers, sources, competitors, and change—connected in one platform.</p></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
  </PublicShell>;
}
