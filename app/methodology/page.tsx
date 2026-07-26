import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Measurement Methodology",
  description: "How Foremention defines buyer questions, collects AI answer evidence, reviews exact sources, checks reliability, tracks actions, and separates facts from judgment.",
  path: "/methodology",
});

const steps = [
  ["01", "Define the decision boundary", "The customer fixes the category, buyer stage, geography, brands, and buyer questions before collection. A changed question becomes a new record instead of silently rewriting history."],
  ["02", "Collect the answer matrix", "Approved questions run against connected providers. Foremention records the response, visible provider and model label, collection time, brand presence, order, and cited pages."],
  ["03", "Review before reporting", "Collected answers remain outside customer metrics until a workspace owner reviews them. Failed attempts and missing provider coverage stay visible."],
  ["04", "Resolve exact source pages", "URLs are normalized without collapsing distinct pages. Each source record can include crawler access, brands present, competitors, recurrence, route, feasibility, and the observations behind it."],
  ["05", "Pass the reliability gate", "Decision Lab checks collection completeness, cross-provider agreement, run-to-run movement, source review, and citation concentration. Missing evidence is never converted into a reassuring score."],
  ["06", "Rank controlled next actions", "Priority gaps are tied to source evidence and legitimate routes. A source must be reviewed before it can become a tracked action."],
  ["07", "Measure what happened later", "Actions move through planned, submitted, published, indexed, observed, repeated, decayed, or closed states. Independent system behavior remains outside Foremention's control."],
  ["08", "Keep business impact separate", "Referral sessions, conversions, or revenue appear only after an approved analytics or CRM integration provides real events and an attribution confidence label."],
];

export default function MethodologyPage() {
  return <PublicShell>
    <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">Measurement standard</span><h1>Every conclusion should survive inspection.</h1><p>Foremention keeps four layers separate: what was collected, what a reviewer approved, what the system recommends, and what happened later.</p></div></section>
    <section className="section section--paper">
      <div className="shell honesty-intro"><span>The operating sequence</span><p>From buyer question to dated evidence to a controlled next move.</p></div>
      <div className="shell method-grid">{steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}</div>
    </section>
    <section className="section section--yellow"><div className="shell metric-layers"><div><span className="eyebrow">Reporting model</span><h2>Three layers. Never one magic score.</h2></div><div><h3>Work completed</h3><p>Questions approved, answers reviewed, sources checked, and actions advanced.</p></div><div><h3>Change observed</h3><p>Presence, first mention, provider agreement, citation recurrence, and decay.</p></div><div><h3>Business signal</h3><p>Referral activity and assisted pipeline only when connected to real events.</p></div></div></section>
  </PublicShell>;
}
