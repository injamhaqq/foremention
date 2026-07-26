import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { articleMetadata, SITE_URL } from "@/lib/seo";

const path = "/insights/seo-geo-technical-checklist";
const publishedTime = "2026-07-27T00:00:00Z";

export const metadata = articleMetadata({
  title: "2026 SEO and GEO Technical Checklist for AI Discovery",
  description:
    "A practical 2026 checklist for crawlability, canonicals, sitemaps, structured data, internal links, OAI-SearchBot, Bing AI visibility, and honest measurement.",
  path,
  publishedTime,
  modifiedTime: publishedTime,
});

const checks = [
  ["Crawl access", "Public pages return 200, robots rules allow intended crawlers, and login-only product routes stay blocked."],
  ["Index signals", "Every indexable page has one production canonical, a unique title, a useful description, and no accidental noindex."],
  ["Discovery", "The XML sitemap contains only preferred production URLs and uses honest last-modified dates."],
  ["Content structure", "Important information exists as readable text with descriptive headings, links, tables, and evidence—not only animation or canvas."],
  ["Structured data", "Organization, SoftwareApplication, Article, or Dataset markup matches what visitors can actually see."],
  ["Internal links", "Every strategic page is reachable through descriptive links from an indexable page."],
  ["AI search access", "OAI-SearchBot and search-engine crawlers can reach public content without WAF, CAPTCHA, or authentication blocks."],
  ["Measurement", "Search Console, Bing Webmaster Tools, analytics, and verified answer collection remain separate data sources."],
];

export default function SeoGeoChecklistPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "2026 SEO and GEO Technical Checklist for AI Discovery",
    description:
      "A technical and content checklist for traditional search and AI-assisted discovery.",
    datePublished: publishedTime,
    dateModified: publishedTime,
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
              <span className="eyebrow eyebrow--on-ink">Technical checklist</span>
              <h1>The 2026 SEO and GEO checklist for an AI-discoverable website.</h1>
              <p>
                Traditional search and AI-assisted discovery share the same
                foundation: crawlable pages, clear intent, useful evidence, consistent
                entities, and measurement that does not overstate what happened.
              </p>
            </div>
            <dl>
              <div><dt>Published</dt><dd>July 27, 2026</dd></div>
              <div><dt>Author</dt><dd>Foremention product research</dd></div>
              <div><dt>Reading time</dt><dd>12 minutes</dd></div>
            </dl>
          </div>
        </header>

        <div className="shell longform-layout">
          <aside className="longform-index" aria-label="Article sections">
            <span>In this guide</span>
            <a href="#foundation">Shared foundation</a>
            <a href="#checklist">Technical checklist</a>
            <a href="#content">Content standard</a>
            <a href="#crawlers">AI crawlers</a>
            <a href="#measurement">Measurement</a>
            <a href="#promotion">Off-page work</a>
          </aside>

          <div className="longform-body">
            <section id="foundation">
              <span className="eyebrow">Start here</span>
              <h2>GEO is not a replacement for technical SEO.</h2>
              <p>
                Google’s current guidance states that there are no special technical
                requirements or unique schema types for appearing in AI Overviews or
                AI Mode. Pages must first be indexable, eligible to show in Search,
                available as text, internally discoverable, and useful to people.
              </p>
              <p>
                That makes the correct order straightforward: repair crawl and index
                signals, publish content that answers a real question, support claims
                with evidence, make entities consistent, then measure where the page
                appears. “AI optimization” cannot rescue a page that advertises the
                wrong canonical origin or cannot be crawled.
              </p>
              <div className="answer-block">
                <strong>Practical rule</strong>
                <p>
                  Build one technically sound, genuinely useful page for one clear
                  intent. Do not generate dozens of near-duplicate keyword pages.
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
              <h2>Write for a decision, not a keyword counter.</h2>
              <p>
                A useful page gives a direct answer, explains the method, shows the
                evidence, names limitations, and helps the reader take a next step.
                Descriptive titles and headings make that purpose easier for both
                people and retrieval systems to understand.
              </p>
              <h3>Use answer-first structure</h3>
              <p>
                Put a concise definition or conclusion near the beginning, then
                provide the depth needed to verify it. Tables, ordered steps, examples,
                and dated references make complex information easier to inspect.
              </p>
              <h3>Show who produced the information</h3>
              <p>
                Use a real person or organization, a publication date, an update date,
                and a clear About or methodology link. Do not invent an expert byline
                to create authority.
              </p>
              <h3>Keep each URL distinct</h3>
              <p>
                A product page, comparison page, definition, research report, and
                implementation guide serve different intents. If two pages repeat the
                same explanation, consolidate them instead of making them compete.
              </p>
            </section>

            <section id="crawlers">
              <span className="eyebrow">AI search access</span>
              <h2>Allow the crawlers that support discovery.</h2>
              <p>
                OpenAI’s publisher guidance says public content can appear in ChatGPT
                search and recommends allowing OAI-SearchBot. It also notes that
                ranking cannot be guaranteed. The crawler must be able to reach the
                page through robots rules, hosting, and any bot-protection layer.
              </p>
              <p>
                The search crawler and the training crawler are separate policy
                choices. OAI-SearchBot supports search discovery; GPTBot controls
                potential training access. Record those choices explicitly rather
                than assuming an `llms.txt` file creates visibility.
              </p>
              <p>
                Google likewise states that no special AI file or AI-specific schema
                is required for its AI search features. Standard crawl, index,
                content, and structured-data practices remain the foundation.
              </p>
            </section>

            <section id="measurement">
              <span className="eyebrow">Measurement stack</span>
              <h2>Connect the systems that own the truth.</h2>
              <ul>
                <li><strong>Google Search Console:</strong> index coverage, queries, impressions, clicks, and search diagnostics.</li>
                <li><strong>Bing Webmaster Tools:</strong> crawl and index data, IndexNow reporting, and supported AI citation activity.</li>
                <li><strong>Analytics or Tag Manager:</strong> referral visits and approved conversion events.</li>
                <li><strong>Answer collection:</strong> dated prompts, providers, responses, brands, and cited sources.</li>
                <li><strong>CRM or billing:</strong> qualified pipeline and revenue events.</li>
              </ul>
              <p>
                Keep these layers connected by URL and date, but do not fill missing
                integrations with estimated customer metrics. A blank state is more
                trustworthy than an attractive number with no source.
              </p>
            </section>

            <section id="promotion" className="longform-limit">
              <span className="eyebrow">Off-page work</span>
              <h2>Authority cannot be installed with code.</h2>
              <p>
                Technical SEO helps systems reach and interpret a page. It does not
                create reputation. Off-page authority comes from useful original
                research, earned references, legitimate editorial coverage,
                partnerships, community participation, and customer evidence.
              </p>
              <p>
                Avoid paid link schemes, fabricated reviews, undisclosed promotion,
                and mass-produced posts. They damage the same trust signals the
                product is supposed to measure.
              </p>
            </section>

            <footer className="article-sources">
              <h2>Primary references</h2>
              <ul>
                <li><a href="https://developers.google.com/search/docs/appearance/ai-features">Google Search Central: AI features and your website</a></li>
                <li><a href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">Google Search Central: helpful, reliable, people-first content</a></li>
                <li><a href="https://help.openai.com/en/articles/12627856">OpenAI: Publishers and Developers FAQ</a></li>
                <li><a href="https://www.bing.com/webmasters/help/indexnow-0z209wby">Bing Webmaster Tools: IndexNow</a></li>
              </ul>
              <Link className="button button--ink" href="/source-map">
                Inspect Foremention’s live audit <Arrow />
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
