import Link from "next/link";
import { Arrow } from "@/components/brand";
import { MissingAnswerExperience, SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";

const faq = [
  { q: "What does Foremention do?", a: "It checks the questions your buyers ask AI, records which brands appear, and shows the exact outside pages supporting those answers." },
  { q: "What is the Source X-Ray?", a: "Source X-Ray reveals the evidence layer beneath an AI answer: the exact outside pages supporting each named brand and the realistic route into those sources." },
  { q: "What is a Source Map?", a: "A Source Map is a list of the webpages shaping your category. It shows which competitors each page mentions, whether your brand appears, and what changed over time." },
  { q: "Do I need to be technical?", a: "No. Add your brand, competitors, and buyer questions. Foremention organizes the answers, sources, evidence, and changes in one workspace." },
  { q: "Can Foremention guarantee an AI recommendation?", a: "No. AI answers and publisher decisions change. Foremention gives you dated evidence, monitoring, and clear actions. It never guarantees rankings, citations, traffic, or revenue." },
  { q: "Can I try the product before paying?", a: "Yes. Open the seeded demo without a credit card, or create an Explorer account to begin with a small tracked question set." },
];

const capabilities = [
  { n: "01", title: "Ask", body: "Save the real questions buyers ask before they choose a product." },
  { n: "02", title: "See", body: "Track which brands appear and the exact pages supporting each answer." },
  { n: "03", title: "Act", body: "Prioritize the gaps that matter and measure what changes after every run." },
];

export default function HomePage() {
  const structuredData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  return (
    <PublicShell>
      <section className="goat-hero"><MissingAnswerExperience /></section>
      <section className="goat-proof-strip" aria-label="Foremention product standard"><div className="shell"><div><strong>URL</strong><span>Exact source evidence</span></div><div><strong>DATED</strong><span>Every observation has a time</span></div><div><strong>SELF-SERVE</strong><span>Your team owns the workspace</span></div><div><strong>0</strong><span>Made-up guarantees</span></div></div></section>
      <section className="platform-section" id="how-it-works"><div className="shell"><div className="platform-heading"><span className="goat-kicker">Recommendation intelligence, made simple</span><h2>Know why AI recommends them instead of you.</h2><p>Foremention turns changing AI answers into a clear, searchable data layer your whole team can use.</p></div><div className="platform-steps">{capabilities.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div></section>
      <section className="goat-xray-section"><div className="shell"><SourceXRayExperience /></div></section>
      <section className="platform-value-section"><div className="shell platform-value-grid"><div><span className="goat-kicker">One workspace, not another report</span><h2>From question to source to change.</h2><p>Every run strengthens your Recommendation Graph: a living record of buyer questions, AI answers, cited pages, competitors, actions, and outcomes.</p><Link className="button button--ink button--large" href="/login">Open the product demo <Arrow /></Link></div><div className="platform-ledger"><div><span>Monitor</span><strong>Buyer questions across supported AI engines</strong></div><div><span>Explain</span><strong>Exact URLs and competitors behind each answer</strong></div><div><span>Prioritize</span><strong>Source gaps by evidence and realistic next action</strong></div><div><span>Measure</span><strong>Movement over time without pretending causation</strong></div></div></div></section>
      <section className="home-pricing-section" id="pricing"><div className="shell"><div className="platform-heading"><span className="goat-kicker">Start small</span><h2>Use the product before you need a sales call.</h2><p>No placement package. No required consulting engagement. Start free and upgrade when you need more questions, brands, history, or automation.</p></div><div className="home-pricing-grid"><article><span>Explorer</span><strong>$0<small>/month</small></strong><p>1 brand, 10 buyer questions, monthly evidence run.</p><Link href="/signup">Create free account <Arrow /></Link></article><article className="is-featured"><span>Builder</span><strong>$49<small>/month</small></strong><p>100 questions, weekly runs, Source Map, movement and alerts.</p><Link href="/signup">Start Builder <Arrow /></Link></article><article><span>Growth</span><strong>$199<small>/month</small></strong><p>5 brands, daily monitoring, Recommendation Graph, API and webhooks.</p><Link href="/pricing">Compare all plans <Arrow /></Link></article></div></div></section>
      <section className="trust-band"><div className="shell trust-band-grid"><div><span className="goat-kicker goat-kicker--light">Trust is a product feature</span><h2>Evidence, limits, and uncertainty stay visible.</h2></div><div><p>Foremention records what was observed. No fake reviews. No hidden promotion. No ranking guarantees.</p><Link className="button button--large" href="/honesty">Read the honesty clause <Arrow /></Link></div></div></section>
      <section className="goat-faq-section"><div className="shell goat-faq-grid"><div><span className="goat-kicker">Clear answers</span><h2>Understand it in five minutes.</h2></div><div>{faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></div></section>
      <section className="goat-final-cta"><div className="shell"><span>See the product, not a promise</span><h2>Find the pages shaping your AI shortlist.</h2><Link className="button button--ink button--large" href="/login">Open the product demo <Arrow /></Link><p>No credit card. Fictional demo data is clearly labelled.</p></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </PublicShell>
  );
}
