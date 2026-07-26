import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { articleMetadata, SITE_URL } from "@/lib/seo";

const path = "/insights/ai-visibility-measurement";
const publishedTime = "2026-07-27T00:00:00Z";

export const metadata = articleMetadata({
  title: "AI Visibility Measurement: A Practical Evidence Framework",
  description:
    "Learn how to measure AI visibility without mixing brand presence, citations, source evidence, referral traffic, and revenue into one misleading score.",
  path,
  publishedTime,
  modifiedTime: publishedTime,
});

const framework = [
  {
    layer: "01",
    name: "Question",
    measure: "The exact buyer question, wording, location, language, and test date.",
    mistake: "Treating an undocumented prompt set as representative demand.",
  },
  {
    layer: "02",
    name: "Answer",
    measure: "Whether a brand is present, how it is described, and where it appears.",
    mistake: "Calling one answer a stable ranking.",
  },
  {
    layer: "03",
    name: "Source",
    measure: "Which URLs are cited or otherwise visible as supporting evidence.",
    mistake: "Assuming every cited page caused every claim in the answer.",
  },
  {
    layer: "04",
    name: "Stability",
    measure: "Agreement across providers and movement across repeated runs.",
    mistake: "Hiding provider disagreement inside a single visibility score.",
  },
  {
    layer: "05",
    name: "Outcome",
    measure: "Verified referrals, conversions, pipeline, or other business events.",
    mistake: "Attributing revenue to a citation without a measurable path.",
  },
];

export default function AiVisibilityMeasurementPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "AI Visibility Measurement: A Practical Evidence Framework",
    description:
      "A five-layer model for measuring AI visibility without inventing causation.",
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
              <span className="eyebrow eyebrow--on-ink">Measurement guide</span>
              <h1>AI visibility measurement: what to track, separate, and never pretend.</h1>
              <p>
                A brand mention, a cited page, a referral visit, and a sale are four
                different events. A trustworthy measurement system keeps them
                connected without pretending they are interchangeable.
              </p>
            </div>
            <dl>
              <div><dt>Published</dt><dd>July 27, 2026</dd></div>
              <div><dt>Author</dt><dd>Foremention product research</dd></div>
              <div><dt>Reading time</dt><dd>11 minutes</dd></div>
            </dl>
          </div>
        </header>

        <div className="shell longform-layout">
          <aside className="longform-index" aria-label="Article sections">
            <span>In this guide</span>
            <a href="#definition">Definition</a>
            <a href="#framework">Five evidence layers</a>
            <a href="#metrics">Metrics that matter</a>
            <a href="#stability">Stability</a>
            <a href="#actions">Action standard</a>
            <a href="#limits">Limits</a>
          </aside>

          <div className="longform-body">
            <section id="definition">
              <span className="eyebrow">Definition</span>
              <h2>What is AI visibility measurement?</h2>
              <p>
                AI visibility measurement is the documented observation of how an AI
                answer system describes, mentions, recommends, and sources brands for
                a defined set of questions. The definition matters because “AI
                visibility” is often used to describe several different things at
                once: brand presence in an answer, a link displayed as a citation,
                search-engine exposure, referral traffic, or a commercial outcome.
              </p>
              <p>
                Those signals may be related, but they are not identical. Bing’s
                current AI Performance documentation makes a similar distinction:
                citation counts show how often a URL appears as a source, not its
                ranking, authority, or role inside an answer. A useful system
                preserves that separation.
              </p>
              <div className="answer-block">
                <strong>Short answer</strong>
                <p>
                  Measure the question, answer, source, repetition, and later outcome
                  separately. Connect the records; do not collapse them into an
                  unexplained score.
                </p>
              </div>
            </section>

            <section id="framework">
              <span className="eyebrow">Five-layer model</span>
              <h2>One evidence chain, five distinct measurements.</h2>
              <div className="framework-table">
                <div className="framework-table__head">
                  <span>Layer</span><span>Measure</span><span>Avoid</span>
                </div>
                {framework.map((item) => (
                  <div className="framework-table__row" key={item.layer}>
                    <strong>{item.layer} · {item.name}</strong>
                    <span>{item.measure}</span>
                    <span>{item.mistake}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="metrics">
              <span className="eyebrow">Metric design</span>
              <h2>The metrics that answer a real business question.</h2>
              <h3>Brand presence rate</h3>
              <p>
                The share of reviewed answers in which the tracked brand appears. The
                denominator must be visible. A 40% presence rate means little if the
                report hides whether it came from five answers or five thousand.
              </p>
              <h3>First-mention share</h3>
              <p>
                The share of reviewed answers where the brand is the first named
                option. It describes answer position inside the collected sample—not
                a universal ranking across all users.
              </p>
              <h3>Source recurrence</h3>
              <p>
                How often the same domains or URLs recur across reviewed answer
                records. Recurrence can identify an evidence dependency, but it does
                not prove that the page alone caused a recommendation.
              </p>
              <h3>Provider agreement</h3>
              <p>
                How consistently comparable providers reach the same presence
                conclusion for the same question. Agreement gives teams a better
                sense of stability than a blended score that hides contradictory
                answers.
              </p>
              <h3>Verified referral and conversion events</h3>
              <p>
                Visits and conversions attributed through real analytics, CRM, or
                server records. These should not appear until the measurement systems
                are connected and the event definitions are approved.
              </p>
            </section>

            <section id="stability">
              <span className="eyebrow">Reliability</span>
              <h2>Why repeated runs matter.</h2>
              <p>
                AI answers vary with wording, provider, model behavior, retrieval
                mode, time, location, and available sources. A single run is an
                observation. A repeated, documented series can become a directional
                pattern. It still does not become a guaranteed forecast.
              </p>
              <p>
                A decision-ready conclusion therefore needs enough completed answers,
                a declared review standard, reasonable agreement across the providers
                being compared, and source evidence that a person can inspect.
                Foremention’s Decision Lab exposes those checks separately rather
                than averaging them into a magic score.
              </p>
            </section>

            <section id="actions">
              <span className="eyebrow">Action standard</span>
              <h2>Move from evidence to a controlled next step.</h2>
              <ol>
                <li>Define the buyer question and why it matters.</li>
                <li>Collect comparable answer records with dates and provider labels.</li>
                <li>Review brand presence and the exact supporting pages.</li>
                <li>Identify the weakest evidence layer, not merely the lowest number.</li>
                <li>Choose a legitimate action: improve owned proof, publish original research, correct an inaccurate claim, or qualify an appropriate editorial route.</li>
                <li>Record what was done and recheck the same question set later.</li>
                <li>Report observed movement separately from claimed causation.</li>
              </ol>
              <p>
                This workflow is slower than promising an instant ranking. It is also
                more useful because another person can inspect the evidence and
                disagree with the judgment.
              </p>
            </section>

            <section id="limits" className="longform-limit">
              <span className="eyebrow">Honest limits</span>
              <h2>What measurement cannot guarantee.</h2>
              <p>
                No measurement platform controls AI-provider behavior, publisher
                decisions, indexing, citations, referral traffic, or revenue. Search
                and answer systems also change. A strong system improves the quality
                of the decision record; it does not remove uncertainty.
              </p>
              <p>
                For that reason, Foremention labels fictional demonstrations, missing
                integrations, partial runs, unreviewed answers, and directional
                patterns inside the product.
              </p>
            </section>

            <footer className="article-sources">
              <h2>Primary references</h2>
              <ul>
                <li><a href="https://developers.google.com/search/docs/appearance/ai-features">Google Search Central: AI features and your website</a></li>
                <li><a href="https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview">Bing Webmaster Tools: AI Performance</a></li>
                <li><a href="https://help.openai.com/en/articles/12627856">OpenAI: Publishers and Developers FAQ</a></li>
              </ul>
              <Link className="button button--ink" href="/source-map">
                Inspect the live Source Map <Arrow />
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
