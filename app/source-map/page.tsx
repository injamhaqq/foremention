import Link from "next/link";
import { Arrow } from "@/components/brand";
import { LiveSiteAudit } from "@/components/live-site-audit";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { siteAuditRecords, siteAuditSnapshot } from "@/lib/site-audit-data";

export const metadata = pageMetadata({
  title: "AI Search Source Map: Dated Website Audit",
  description:
    "Inspect a dated, evidence-based Source Map of Foremention.com: crawlability, canonicals, sitemap health, content gaps, resolved issues, and unconnected external signals.",
  path: "/source-map",
});

export default function SourceMapProductPage() {
  const auditSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Foremention public website Source Map",
    description:
      "A dated technical and content audit of the public Foremention website.",
    url: "https://foremention.com/source-map",
    dateModified: siteAuditSnapshot.collectedAt,
    creator: {
      "@type": "Organization",
      name: "Foremention",
      url: "https://foremention.com",
    },
    variableMeasured: [
      "HTTP status",
      "canonical URL coverage",
      "sitemap origin",
      "index hygiene",
      "content coverage",
      "mobile overflow",
    ],
  };

  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Public Source Map · dated website audit</span>
          <h1>See the website problems we observed—and the evidence behind each fix.</h1>
          <p>
            This is not a fictional customer report or a continuously refreshed dashboard. It is a dated self-audit of the
            production Foremention website, collected from public pages on July 27, 2026.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="audit-provenance">
            <div>
              <span>Audited origin</span>
              <strong>{siteAuditSnapshot.auditedOrigin}</strong>
            </div>
            <div>
              <span>Collection date</span>
              <strong>July 27, 2026</strong>
            </div>
            <div>
              <span>Before this release</span>
              <strong>{siteAuditSnapshot.before.sitemapUrls} public URLs</strong>
            </div>
            <div>
              <span>HTTP availability</span>
              <strong>{siteAuditSnapshot.before.successfulPages}/{siteAuditSnapshot.before.sitemapUrls} passed</strong>
            </div>
          </div>

          <div className="section-heading">
            <span className="eyebrow">Evidence record</span>
            <h2>Problems, proof, resolution, and remaining connections.</h2>
            <p>
              “Resolved” means the problem was observed on the audited production snapshot and repaired. “Needs live connection” means the website alone cannot
              truthfully produce the signal. Open “Inspect this evidence” to read the record here; raw technical files open only as a clearly labelled secondary source.
            </p>
          </div>
          <LiveSiteAudit records={siteAuditRecords} />
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell split-section">
          <div>
            <span className="eyebrow eyebrow--on-ink">What this proves</span>
            <h2>A Source Map should expose uncertainty, not decorate a dashboard.</h2>
          </div>
          <div className="truth-list">
            <div>
              <span>01</span>
              <p><strong>Directly observed.</strong> Status codes, metadata, sitemap entries, and page structure came from the public production origin.</p>
            </div>
            <div>
              <span>02</span>
              <p><strong>Clearly inferred.</strong> Content and measurement gaps are labelled analysis, not traffic or ranking facts.</p>
            </div>
            <div>
              <span>03</span>
              <p><strong>Still unavailable.</strong> Search impressions, backlinks, AI citations, and conversions stay unreported until their real systems are connected.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell split-section">
          <div><span className="eyebrow">Looking for market research?</span><h2>Company evidence now has its own comparison home.</h2></div>
          <div><p>Keep this page focused on one audited origin. Dated first-party observations about Profound, Scrunch, Peec AI, and OtterlyAI are preserved separately with their evidence boundaries intact.</p><Link className="text-link" href="/compare">Open market evidence <Arrow /></Link></div>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-band__inner">
          <div>
            <span className="eyebrow">Use the same standard</span>
            <h2>Build an evidence record for your category.</h2>
          </div>
          <Link className="button button--ink button--large" href="/signup">
            Create workspace <Arrow />
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(auditSchema) }}
      />
    </PublicShell>
  );
}
