import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { articleMetadata, SITE_URL } from "@/lib/seo";

const path = "/insights/seo-geo-technical-checklist";
const publishedTime = "2026-07-27T00:00:00Z";
const modifiedTime = "2026-08-26T00:00:00Z";

export const metadata = articleMetadata({
  title: "2026 Technical Search Checklist for AI Discovery",
  description:
    "An August 2026 checklist for crawlability, canonicals, sitemaps, structured data, internal links, generative AI search access, Search Console measurement, and honest limitations.",
  path,
  publishedTime,
  modifiedTime,
});

const checks = [
  ["Crawl access", "Public pages return useful status codes, intended search crawlers can reach them, and login-only product routes stay blocked."],
  ["Index signals", "Every indexable page has one production canonical, a unique useful title and description, and no accidental noindex."],
  ["Discovery", "The XML sitemap contains preferred production URLs rather than every legacy or low-value route."],
  ["Content structure", "Important information exists as readable text with descriptive headings, links, examples, and evidence—not only animation or canvas."],
  ["Structured data", "Organization, Breadcrumb, Article, or other supported markup is used only when it truthfully matches visible page content and the relevant search feature."],
  ["Internal links", "Every strategic page is reachable through descriptive links from another useful, indexable page."],
  ["Generative AI search", "Apply foundational SEO and publish unique, non-commodity content; do not rely on AEO/GEO hacks, chunking, or llms.txt for Google Search visibility."],
  ["Measurement", "Use Search Console, including the Generative AI performance report when available to the property, alongside analytics and Foremention recommendation observations as separate evidence layers."],
] as const;

export default function SeoGeoChecklistPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "2026 Technical Search Checklist for AI Discovery",
    description:
      "A technical and content checklist for traditional search and generative AI search discovery.",
    datePublished: publishedTime,
    dateModified: modifiedTime,
    mainEntityOfPage: `${SITE_URL}${path}`,
    author: { "@type": "Organization", name: "Foremention", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Foremention", url: SITE_URL },
  };

  return (
    <PublicShell>
      <article className="longform">
        <header className="longform-hero">
          <div className="shell longform-hero__inner">
            <div>
              <span className="eyebrow eyebrow--on-ink">Technical search checklist</span>
              <h1>The 2026 technical search checklist for an AI-discoverable website.</h1>
              <p>
                Google&apos;s current guidance keeps the foundation familiar: crawlable and indexable
                pages, useful non-commodity content, clear technical structure, good page experience,
                and measurement that does not overstate what happened.
              </p>
            </div>
            <dl>
              <div><dt>Published</dt><dd>July 27, 2026</dd></div>
              <div><dt>Updated</dt><dd>August 26, 2026</dd></div>
              <div><dt>Author</dt><dd>Foremention product research</dd></div>
            </dl>
          </div>
        </header>

        <div className="shell longform-layout">
          <aside className="longform-index" aria-label="Article sections">
            <span>In this guide</span>
            <a href="#foundation">Shared foundation</a>
            <a href="#checklist">Technical checklist</a>
            <a href="#content">Content standard</a>
            <a href="#generative">Generative AI search</a>
            <a href="#measurement">Measurement</a>
            <a href="#promotion">Off-page work</a>
          </aside>

          <div className="longform-body">
            <section id="foundation">
              <span className="eyebrow">Start here</span>
              <h2>For Google Search, generative AI optimization is still SEO.</h2>
              <p>
                Google&apos;s 2026 guidance says the best practices for SEO continue to apply to
                generative AI features in Search. These experiences use the core Search index and
                ranking systems, including retrieval-augmented generation and query fan-out.
              </p>
              <p>
                The practical order is still: make the page crawlable and indexable, answer a real
                user need with unique material, keep the technical structure clear, use structured
                data only where it is supported and truthful, and measure the resulting search behavior.
              </p>
              <div className="answer-block">
                <strong>Practical rule</strong>
                <p>
                  Build a strong page for a real audience and a real intent. Do not manufacture
                  dozens of thin pages for every possible query variation or model fan-out.
                </p>
              </div>
            </section>

            <section id="checklist">
              <span className="eyebrow">Eight controls</span>
              <h2>The technical checklist.</h2>
              <div className="checklist-grid">
                {checks.map(([title, body], index) => (
                  <article key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="content">
              <span className="eyebrow">On-page content</span>
              <h2>Publish non-commodity information people would still want without the search engine.</h2>
              <p>
                Google&apos;s current generative AI search guide emphasizes valuable, unique,
                people-first material rather than recycled summaries. For Foremention, that means
                original methodology, recommendation evidence, buyer-question research, source
                quality analysis, provider variability, and comparable measurement—not generic
                “ten AI visibility tips” content.
              </p>
              <h3>Use structure for people first</h3>
              <p>
                Descriptive headings, paragraphs, examples, tables and clear internal links help
                readers navigate complex information. There is no required “AI chunk” size and no
                ideal page length for generative AI search.
              </p>
              <h3>Keep each URL distinct</h3>
              <p>
                Product, Recommendation Intelligence, Recommendation Record, methodology and research
                serve different intents. If two pages become near-duplicates,
                consolidate instead of creating internal competition.
              </p>
            </section>

            <section id="generative">
              <span className="eyebrow">Generative AI search</span>
              <h2>Ignore the hacks Google explicitly says you do not need.</h2>
              <p>
                Google says llms.txt is not needed for Google Search and neither helps nor harms
                Search visibility or rankings. It also says there is no requirement to chunk content
                into tiny pieces, rewrite everything only for AI systems, chase inauthentic mentions,
                or add special AI-specific structured data.
              </p>
              <p>
                Standard crawl and index controls remain the foundation. If a separate service uses
                an AI-specific file or protocol, support it only for that concrete purpose rather than
                treating it as a ranking mechanism.
              </p>
            </section>

            <section id="measurement">
              <span className="eyebrow">Measurement stack</span>
              <h2>Keep search data and recommendation observations separate.</h2>
              <ul>
                <li><strong>Google Search Console:</strong> index diagnostics, queries, impressions, clicks, and—when available to the property—the Generative AI performance report.</li>
                <li><strong>Analytics:</strong> referral visits and approved conversion events.</li>
                <li><strong>Foremention Recommendation Records:</strong> dated buyer questions, provider/model context, answers, named vendors, returned references, retrievability and review state.</li>
                <li><strong>CRM or billing:</strong> qualified pipeline and revenue only when a real integration supplies those events.</li>
              </ul>
              <p>
                These layers can be connected by URL, date and approved identifiers, but missing
                data must remain missing. Search impressions do not prove a recommendation caused a
                visit, and recommendation movement does not prove an optimization caused the change.
              </p>
            </section>

            <section id="promotion" className="longform-limit">
              <span className="eyebrow">Off-page work</span>
              <h2>Authority cannot be installed with code.</h2>
              <p>
                Useful original research, legitimate editorial references, partnerships, community
                participation and real customer evidence can build reputation. Fabricated reviews,
                paid link schemes, undisclosed promotion and inauthentic mention campaigns undermine it.
              </p>
            </section>

            <footer className="article-sources">
              <h2>Primary references</h2>
              <ul>
                <li><a href="https://developers.google.com/search/docs/fundamentals/ai-optimization-guide">Google Search Central: optimizing for generative AI features</a></li>
                <li><a href="https://developers.google.com/search/docs/appearance/ai-features">Google Search Central: AI features and your website</a></li>
                <li><a href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">Google Search Central: helpful, reliable, people-first content</a></li>
                <li><a href="https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports">Google Search Central: Generative AI performance reports</a></li>
              </ul>
              <Link className="button button--ink" href="/recommendation-intelligence">
                Explore Recommendation Intelligence <Arrow />
              </Link>
            </footer>
          </div>
        </div>
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </PublicShell>
  );
}
