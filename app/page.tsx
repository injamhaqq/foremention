import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { MissingAnswerExperience, SourceXRayExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { VerifiedSocialProof } from "@/components/verified-social-proof";
import styles from "@/components/homepage-readiness.module.css";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Recommendation Intelligence for B2B SaaS",
  description:
    "See where your B2B SaaS brand and competitors appear in AI recommendations, preserve returned citation URLs, review the evidence, and compare what changes over time.",
  path: "/",
});

const faq = [
  { q: "What does Foremention do?", a: "Foremention records the buyer questions that matter, collects dated AI answers from connected providers, shows which brands appear, preserves returned citation URLs when available, and keeps later review and analysis tied to the original evidence." },
  { q: "Who is Foremention for?", a: "Foremention is built for B2B SaaS marketing, growth, product, and strategy teams that need a shared record of how important category questions are answered across AI systems." },
  { q: "What is Source X-Ray?", a: "Source X-Ray is Foremention's inspection layer. It helps teams move from an observed AI answer to returned citation URLs, named brands, review status, and the evidence record behind a finding." },
  { q: "What is the difference between an observation and a finding?", a: "An observation is what a provider returned at a specific time. A finding is a later conclusion made from reviewed evidence. Foremention keeps those states separate so an inference is not mistaken for a fact." },
  { q: "Does Foremention guarantee better AI rankings or citations?", a: "No. AI answers, citations, and publisher decisions can change. Foremention records evidence and change; it does not guarantee rankings, recommendations, citations, traffic, leads, revenue, or causation." },
  { q: "Can I start without paying?", a: "You can create a workspace without a card charge. Collection capacity and paid access are activated separately. Foremention does not present paid checkout as live until billing and entitlement handling are verified." },
];

const evidenceChain = [
  { n: "01", title: "Buyer question", body: "Approve the exact question before collection so later runs stay comparable." },
  { n: "02", title: "Dated answer", body: "Keep the provider, model label, response, status, and collection time together." },
  { n: "03", title: "Returned sources", body: "Preserve citation URLs when the provider supplies them instead of replacing them with a score." },
  { n: "04", title: "Human review", body: "Check what the cited page actually says and keep observation separate from inference." },
  { n: "05", title: "Comparable change", body: "Run the same approved question later and show what changed without pretending causation." },
];

const learn = [
  { n: "Presence", title: "Who appears", body: "See whether your brand is present and which competitors appear in the same answer record." },
  { n: "Sources", title: "What shaped the answer", body: "Inspect the returned citation URLs and review the pages behind those observations." },
  { n: "Change", title: "What moved", body: "Compare later runs to find new, lost, or recurring evidence once enough comparable data exists." },
];

const differences = [
  { n: "01", title: "Evidence before scores", body: "A metric should trace back to a question, answer, source record, date, and review state." },
  { n: "02", title: "Uncertainty stays visible", body: "Partial runs, missing citations, unreviewed pages, and insufficient history stay clearly labelled." },
  { n: "03", title: "Action stays accountable", body: "A proposed next step can be linked to the evidence that supported it and compared with later observations." },
];

const workflow = [
  { n: "Monitor", title: "Collect", body: "Run approved buyer questions under defined provider and capacity controls." },
  { n: "Review", title: "Inspect", body: "Open answer records, returned citations, competitor presence, and Source X-Ray." },
  { n: "Act", title: "Decide", body: "Turn reviewed evidence into a legitimate next action instead of a generic AI recommendation." },
  { n: "Repeat", title: "Compare", body: "Rerun the same question later and record what changed, what did not, and what remains uncertain." },
];

export default function HomePage() {
  const structuredData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };

  return <PublicShell>
    <section className="goat-hero"><MissingAnswerExperience /></section>

    <section className="goat-proof-strip" aria-label="Foremention evidence standard"><div className="shell"><div><strong>DATED</strong><span>Every observation has a time</span></div><div><strong>TRACEABLE</strong><span>Findings link back to records</span></div><div><strong>REVIEWED</strong><span>Human judgment stays labelled</span></div><div><strong>LIMITED</strong><span>Unknowns stay visible</span></div></div></section>

    <section className="platform-section" id="how-it-works">
      <div className="shell">
        <div className={styles.sectionIntro}><span className="goat-kicker">The evidence chain</span><h2>Know where every conclusion came from.</h2><p>Most AI-visibility dashboards start with a score. Foremention starts with the record underneath it, then keeps each later judgment attached to that evidence.</p></div>
        <div className={styles.chainGrid}>{evidenceChain.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </div>
    </section>

    <section className="goat-xray-section"><div className="shell"><SourceXRayExperience /></div></section>

    <section className="platform-section">
      <div className="shell">
        <div className={styles.sectionIntro}><span className="goat-kicker">What your team learns</span><h2>Three questions your AI visibility data should answer.</h2><p>Foremention is designed to help a team understand presence, source evidence, and change without turning uncertainty into marketing theatre.</p></div>
        <div className={styles.learnGrid}>{learn.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </div>
    </section>

    <section className="platform-value-section">
      <div className="shell">
        <div className={styles.sectionIntro}><span className="goat-kicker">Why Foremention is different</span><h2>The evidence stays inspectable after the dashboard loads.</h2><p>Foremention separates what an AI provider returned, what a cited page contained, what the system inferred, what a human approved, and what happened later.</p></div>
        <div className={styles.differenceGrid}>{differences.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </div>
    </section>

    <section className="platform-section">
      <div className="shell">
        <div className={styles.sectionIntro}><span className="goat-kicker">Recurring workflow</span><h2>From one observation to a repeatable operating loop.</h2><p>The product becomes more useful as the same approved questions are collected, reviewed, acted on, and compared again over time.</p></div>
        <div className={styles.workflowGrid}>{workflow.map((item) => <article key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </div>
    </section>

    <section className="home-pricing-section" id="pricing">
      <div className="shell">
        <div className={styles.sectionIntro}><span className="goat-kicker">Start with a workspace</span><h2>Explore the product before paid access is activated.</h2><p>Creating a workspace does not charge a card. Core, Signal, and Intelligence show the operating scopes being validated during private beta; final paid pricing will be confirmed before commercial launch.</p></div>
        <div className={styles.entryBand}>
          <div><span className="goat-kicker">Workspace entry</span><h3>Create your Foremention workspace.</h3><p>Set your company, category, competitors, and buyer questions. Collection capacity is confirmed separately.</p></div>
          <div className={styles.entryAction}><Link className="button button--ink button--large" href="/signup">Create a workspace <Arrow /></Link><small>No card charge for workspace creation. See the pricing page for current package scope and activation status.</small></div>
        </div>
        <div className="home-pricing-grid">
          <article><span>Core</span><strong>Pricing to be confirmed</strong><p>One brand and category, up to 25 buyer questions, monthly collection capacity, Source Map, evidence history, and review workflow.</p><Link href="/pricing">View Core details <Arrow /></Link></article>
          <article className="is-featured"><span>Signal</span><strong>Pricing to be confirmed</strong><p><b>Everything in Core, plus</b> weekly capacity, broader question coverage, cross-provider agreement, source movement, and team review workflow.</p><Link href="/pricing">View Signal details <Arrow /></Link></article>
          <article><span>Intelligence</span><strong>Custom scope</strong><p><b>Everything in Signal, plus</b> multi-brand scope, tailored capacity, longer evidence history, and a confirmed integration scope.</p><Link href="/pricing">View platform plans <Arrow /></Link></article>
        </div>
      </div>
    </section>

    <section className="trust-band">
      <div className="shell">
        <div className="trust-band-grid">
          <div><span className="goat-kicker goat-kicker--light">Method before claims</span><h2>Foremention shows the limits with the result.</h2></div>
          <div><p>A provider may return no citations. A source may still need review. One run is a baseline, not a trend. A later change is an observation, not proof of causation. No fake reviews. No hidden promotion. No ranking guarantees.</p><div className="goat-hero__actions"><Link className="button button--large" href="/methodology">Read the methodology <Arrow /></Link><Link className="goat-text-link" href="/standards">Read our standards</Link></div></div>
        </div>
        <div className={styles.truthRow} aria-label="Foremention evidence states"><div><strong>Observed</strong><span>What the provider returned</span></div><div><strong>Reviewed</strong><span>What a person checked</span></div><div><strong>Inferred</strong><span>What Foremention concluded</span></div><div><strong>Compared</strong><span>What changed later</span></div></div>
      </div>
    </section>

    <VerifiedSocialProof />

    <section className="goat-faq-section"><div className="shell goat-faq-grid"><div><span className="goat-kicker">Clear answers</span><h2>Before you create a workspace.</h2></div><div>{faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></div></section>

    <section className="goat-final-cta"><div className="shell"><span>Recommendation intelligence for B2B SaaS</span><h2>See the answer. Inspect the source. Decide what to do next.</h2><Link className="button button--ink button--large" href="/signup">Create a workspace <Arrow /></Link><p>Questions, answers, citations, competitors, review, and change — connected in one evidence trail.</p></div></section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
  </PublicShell>;
}
