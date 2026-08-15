import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import {
  marketEvidenceRecords,
  marketEvidenceSnapshot,
} from "@/lib/market-evidence-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Visibility Market Evidence & Comparisons",
  description:
    "Inspect Foremention’s dated first-party market evidence and compare the product with monitoring tools, GEO agencies, and PR agencies without unsupported superiority claims.",
  path: "/compare",
});

const comparisonRoutes = [
  {
    href: "/compare/monitoring-tools",
    title: "AI monitoring tools",
    body: "Compare monitoring-oriented workflows with Foremention’s source-evidence and review model.",
  },
  {
    href: "/compare/geo-agencies",
    title: "GEO agencies",
    body: "Compare a customer-operated evidence workflow with service-led GEO engagements.",
  },
  {
    href: "/compare/pr-agencies",
    title: "PR agencies",
    body: "Compare buyer-question evidence tracking with traditional editorial and awareness work.",
  },
];

export default function CompareHubPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Dated market evidence</span>
          <h1>Compare category claims without blurring them into the sales pitch.</h1>
          <p>
            This is a dated research set built from first-party vendor pages. The buyer
            question is: <strong>{marketEvidenceSnapshot.buyerQuestion}</strong> The
            observations below were collected on {marketEvidenceSnapshot.collectedAt}.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Evidence boundary</span>
            <h2>Not product telemetry.</h2>
            <p>
              A recorded source means only that the claim or pricing was present on the vendor page when we checked it—not that a vendor claim is independently true and not that an AI engine cited the page. Product performance, customer outcomes, provider coverage, and causation remain outside this evidence set unless separately verified.
            </p>
          </div>

          <nav
            className="market-evidence__index"
            aria-label="Companies in this market evidence set"
          >
            {marketEvidenceRecords.map((record, index) => (
              <a
                href={`#company-${record.company.toLowerCase().replaceAll(" ", "-")}`}
                key={record.company}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {record.company}
              </a>
            ))}
          </nav>

          <div className="market-evidence">
            {marketEvidenceRecords.map((record, index) => (
              <article
                id={`company-${record.company.toLowerCase().replaceAll(" ", "-")}`}
                key={record.company}
              >
                <div className="market-evidence__head">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>Official source observed</b>
                </div>
                <h3>{record.company}</h3>
                <a href={record.officialUrl} target="_blank" rel="noreferrer">
                  {record.domain} ↗
                </a>
                <dl>
                  <div>
                    <dt>Observed on the page</dt>
                    <dd>{record.observed}</dd>
                  </div>
                  <div>
                    <dt>Evidence boundary</dt>
                    <dd>{record.evidenceBoundary}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Choose the right comparison</span>
            <h2>Why Foremention approaches the category differently.</h2>
            <p>
              These pages compare category-level operating models rather than marketing
              adjectives. They do not claim that every vendor or agency behaves identically,
              and they do not promise an outcome Foremention cannot verify.
            </p>
          </div>
          <div className="pricing-shared">
            {comparisonRoutes.map((item, index) => (
              <article key={item.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Link href={item.href}>
                  Open comparison <Arrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-band__inner">
          <div>
            <span className="eyebrow">Keep the boundary clear</span>
            <h2>See Foremention’s own dated website evidence separately.</h2>
          </div>
          <Link className="button button--ink button--large" href="/source-map">
            Open Source Map <Arrow />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
