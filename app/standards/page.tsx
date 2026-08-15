import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Evidence and Ethics Standards",
  description: "The evidence, stability, review, attribution, crawler, and ethical-promotion standards behind the Foremention recommendation intelligence platform.",
  path: "/standards",
});

const standards = [
  ["01", "Outcomes are not for sale", "Foremention does not guarantee placement, ranking, recommendation, citation, traffic, pipeline, revenue, or editorial acceptance."],
  ["02", "AI answers are observations", "An answer is tied to a question, provider, visible model label, collection time, and available context. It is not a permanent statement of truth."],
  ["03", "Review precedes reporting", "Unreviewed answers and failed provider attempts do not enter approved customer metrics. Missing data remains visible."],
  ["04", "Stability must be earned", "A single run cannot establish a trend. Cross-provider agreement and repeat observations are shown before the product calls a signal decision-ready."],
  ["05", "Facts and judgments stay separate", "Counts and dated observations are not mixed with analyst judgments such as influence, feasibility, relevance, or priority."],
  ["06", "No synthetic authority", "No fake reviews, false identities, fabricated experts, undisclosed promotion, link schemes, or paid coverage presented as independent editorial evidence."],
  ["07", "Customers control material claims", "Quotes, product claims, research inputs, and external submissions need accurate customer information and a recorded approval path."],
  ["08", "Attribution has confidence labels", "Referral or revenue impact appears only when connected data exists, and verified, assisted, inferred, and unknown attribution remain distinct."],
  ["09", "Independent systems change", "AI providers, publishers, search systems, and review sites can change access, rules, models, and outputs without notice."],
];

export default function StandardsPage() {
  return <PublicShell>
    <section className="page-hero page-hero--yellow"><div className="shell narrow-heading"><span className="eyebrow">Product standards</span><h1>Useful evidence, without invented certainty.</h1><p>Foremention is designed to help teams make better decisions from dated, reviewable records—not to promise outcomes that nobody can control.</p></div></section>
    <section className="section section--paper">
      <div className="shell honesty-intro"><span>How the platform behaves</span><p>Every metric should have a clear origin, a review state, a timestamp, and a visible limit.</p></div>
      <div className="shell honesty-grid">{standards.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}<article><span>10</span><h2>Questions are welcome</h2><p>Ask how a collection, score, or recommendation was formed at <a href="mailto:hello@foremention.com">hello@foremention.com</a>.</p></article></div>
    </section>
  </PublicShell>;
}
