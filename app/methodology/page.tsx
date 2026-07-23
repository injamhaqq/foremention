import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Methodology", description: "How Foremention reviews buyer questions, exact outside pages, source gaps, and placement outcomes." };

const steps = [
  ["01", "Choose the buyer questions", "We agree on the category, buyer stage, geography, and questions before collection. A changed question becomes a new record instead of rewriting history."],
  ["02", "Save the answer evidence", "We review the same questions across the agreed AI tools. We keep the answer, date, visible model label, brand order, and exact cited pages."],
  ["03", "Resolve source entities", "URLs are normalized without collapsing distinct pages. We record source type, crawler access, brands present, recurrence, and the answer evidence behind each score."],
  ["04", "Build the Source Map", "Sources are ranked using observable recurrence and relevance. Entry feasibility is a human judgment and is labelled separately from evidence."],
  ["05", "Qualify legitimate routes", "We exclude fabricated reviews, undisclosed promotion, link schemes, false identities, pay-to-play coverage presented as editorial, and editorial-pressure tactics."],
  ["06", "Track what happens", "An opportunity moves through found, checked, pitched, accepted, published, indexed, first cited, repeatedly cited, and lost states."],
];

export default function MethodologyPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink"><div className="shell narrow-heading"><span className="eyebrow eyebrow--on-ink">How the X-Ray works</span><h1>Every claim should have a trail.</h1><p>Foremention keeps four things separate: what we saw, what we think it means, what we did, and what happened later.</p></div></section>
      <section className="section section--paper"><div className="shell method-grid">{steps.map(([n,title,body]) => <article key={n}><span>{n}</span><h2>{title}</h2><p>{body}</p></article>)}</div></section>
      <section className="section section--yellow"><div className="shell metric-layers"><div><span className="eyebrow">Reporting model</span><h2>Three layers. Never one magic score.</h2></div><div><h3>Work completed</h3><p>Sources checked, pitches sent, placements published, pages updated.</p></div><div><h3>Change observed</h3><p>Index status, first-cited date, answer coverage, first-mention share, citation survival.</p></div><div><h3>Business signal</h3><p>AI referral traffic, branded search, qualified demos, assisted pipeline.</p></div></div></section>
    </PublicShell>
  );
}
