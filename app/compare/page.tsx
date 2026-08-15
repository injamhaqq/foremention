import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { marketEvidenceRecords, marketEvidenceSnapshot } from "@/lib/market-evidence-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Market Evidence & Comparisons",
  description: "Inspect dated first-party market evidence and Foremention comparison methods without treating vendor claims as independent product proof.",
  path: "/compare",
});

const comparisonPaths = [
  ["/compare/monitoring-tools", "Monitoring tools", "Compare monitoring-oriented operating models and evidence boundaries."],
  ["/compare/geo-agencies", "GEO agencies", "Understand the difference between measurement software and managed execution."],
  ["/compare/pr-agencies", "PR agencies", "Separate recommendation monitoring from earned-media and outreach work."],
] as const;

export default function ComparePage() {
  return <PublicShell>
    <section className="page-hero page-hero--yellow">
      <div className="shell narrow-heading">
        <span className="eyebrow">Market evidence &amp; comparisons</span>
        <h1>Compare the category without pretending vendor claims are proof.</h1>
        <p>Foremention keeps a dated record of what selected companies publicly describe on their own first-party pages. Those observations can help buyers understand the market, but they do not prove that an AI engine cited a page, that a vendor claim is independently true, or that one product is superior.</p>
      </div>
    </section>

    <section className="section section--paper">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow">Dated first-party evidence</span>
          <h2>What four platforms publicly described on {marketEvidenceSnapshot.collectedAt}.</h2>
          <p>Buyer question: <strong>{marketEvidenceSnapshot.buyerQuestion}</strong> This is a market-research record, not an AI-answer citation ledger and not a Foremention endorsement.</p>
        </div>
        <nav className="market-evidence__index" aria-label="Companies in this evidence set">
          {marketEvidenceRecords.map((record, index) => (
            <a href={`#company-${record.company.toLowerCase().replaceAll(" ", "-")}`} key={record.company}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {record.company}
            </a>
          ))}
        </nav>
        <div className="market-evidence">
          {marketEvidenceRecords.map((record, index) => (
            <article id={`company-${record.company.toLowerCase().replaceAll(" ", "-")}`} key={record.company}>
              <div className="market-evidence__head">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>Official source observed</b>
              </div>
              <h3>{record.company}</h3>
              <a href={record.officialUrl} target="_blank" rel="noreferrer" aria-label={`${record.company} official source (opens in a new tab)`}>{record.domain} ↗</a>
              <dl>
                <div><dt>Observed on the page</dt><dd>{record.observed}</dd></div>
                <div><dt>Evidence boundary</dt><dd>{record.evidenceBoundary}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="section section--ink">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow eyebrow--on-ink">Choose the comparison question</span>
          <h2>Compare operating models, not invented scorecards.</h2>
          <p>These guides explain category differences and evidence boundaries. They are not league tables and do not claim universal superiority.</p>
        </div>
        <div className="market-research-links">
          {comparisonPaths.map(([href, title, body]) => <Link href={href} key={href}><small>Research guide</small><span>{title}<br /><small>{body}</small></span><Arrow /></Link>)}
        </div>
      </div>
    </section>

    <section className="cta-band">
      <div className="shell cta-band__inner">
        <div><span className="eyebrow">Measure your own category</span><h2>Move from market claims to dated evidence.</h2></div>
        <Link className="button button--ink button--large" href="/signup">Create workspace <Arrow /></Link>
      </div>
    </section>
  </PublicShell>;
}
