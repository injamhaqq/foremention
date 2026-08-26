import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact Foremention",
  description:
    "Request a Foremention demo, discuss Recommendation Intelligence for your B2B software category, or contact hello@foremention.com for product, private-beta, account, and partnership questions.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PublicShell>
      <section className="page-hero page-hero--ink">
        <div className="shell narrow-heading">
          <span className="eyebrow eyebrow--on-ink">Request a demo</span>
          <h1>Bring the buyer questions that matter to your category.</h1>
          <p>
            We&apos;ll show how Foremention turns an observed AI software recommendation into a
            Recommendation Record, inspects the returned evidence with Source X-Ray, and keeps
            uncertainty and later-comparison boundaries visible.
          </p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell contact-grid">
          <article>
            <span>Founder-led demo</span>
            <h2>Discuss your recommendation-intelligence use case.</h2>
            <p>
              Email <a href="mailto:hello@foremention.com">hello@foremention.com</a> with your company,
              software category, role, and one or two buyer questions you want to inspect.
            </p>
            <a className="button" href="mailto:hello@foremention.com?subject=Foremention%20demo%20request">
              Email Foremention <Arrow />
            </a>
          </article>
          <article>
            <span>Private beta</span>
            <h2>Prefer to explore the workspace?</h2>
            <p>
              Private-beta workspace access remains available. Creating a workspace does not activate
              paid billing, and commercial packaging is still being validated.
            </p>
            <Link className="button button--outline" href="/signup">Private beta workspace <Arrow /></Link>
          </article>
        </div>
      </section>

      <section className="section section--yellow">
        <div className="shell split-section">
          <div><span className="eyebrow">Useful context for the demo</span><h2>Start with a real decision, not a generic dashboard tour.</h2></div>
          <div><p>A category, a small set of priority buyer questions, meaningful competitors, and the decision your PMM or marketing team is trying to make are enough to make the conversation concrete.</p><Link className="text-link" href="/recommendation-record">See a Recommendation Record <Arrow /></Link></div>
        </div>
      </section>
    </PublicShell>
  );
}
