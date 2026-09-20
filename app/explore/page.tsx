import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Explore Foremention",
  description: "Find Foremention products, free tools, evidence standards, research, trust resources, and account actions from one page.",
  path: "/explore",
});

const groups = [
  {
    id: "start",
    eyebrow: "Start here",
    title: "Understand the product",
    items: [
      ["/product", "Product", "See the recommendation-intelligence workflow from observation through verification."],
      ["/#how-it-works", "How it works", "Follow the end-to-end process without leaving the homepage."],
      ["/pricing", "Plans", "Review coverage options and current founder-led commercial status."],
      ["/recommendation-record", "Recommendation Record", "Inspect the core evidence object Foremention preserves."],
    ],
  },
  {
    id: "free-tools",
    eyebrow: "Free tools",
    title: "Run a live check",
    items: [
      ["/score", "AI Brand Visibility Score", "Run five dated buyer questions and see whether your brand appears."],
      ["/prompt-check", "Prompt Coverage Check", "Run one exact buyer question and inspect the answer and returned citations."],
      ["/sample-report", "Sample report", "See a clearly fictional example of the report structure before signing up."],
      ["/roi", "ROI calculator", "Model the economics of a recommendation-intelligence program with explicit assumptions."],
    ],
  },
  {
    id: "evidence",
    eyebrow: "Evidence & trust",
    title: "Inspect how claims are handled",
    items: [
      ["/methodology", "Methodology", "Read the measurement and comparison rules behind the product."],
      ["/source-map", "Source Map", "Understand how returned sources are mapped and reviewed."],
      ["/standards", "Standards", "See the operating rules for evidence, review, and causal restraint."],
      ["/trust", "Trust Center", "Review security, privacy, governance, and operational boundaries."],
      ["/honesty", "Honesty clause", "See what Foremention will not claim or guarantee."],
      ["/subprocessors", "Subprocessors", "Review the current service and provider boundary."],
    ],
  },
  {
    id: "learn",
    eyebrow: "Learn",
    title: "Build the mental model",
    items: [
      ["/recommendation-intelligence", "Recommendation Intelligence", "Read the category definition and operating model."],
      ["/ai-mediated-buying", "AI-mediated buying", "Understand how AI systems can shape software discovery and shortlists."],
      ["/monitoring-vs-execution", "Monitoring vs execution", "Separate observation from the company changes a team actually controls."],
      ["/insights", "Research & evidence", "Browse Foremention research, evidence notes, and measurement guidance."],
      ["/glossary", "Glossary", "Look up product, evidence, and measurement terminology."],
      ["/teardowns", "Teardowns", "Explore structured category and evidence analyses."],
    ],
  },
  {
    id: "company",
    eyebrow: "Company & ecosystem",
    title: "Work with Foremention",
    items: [
      ["/about", "About", "Learn what Foremention is building and why."],
      ["/partners", "Partners", "Review partner and ecosystem information."],
      ["/api-docs/webhooks", "Webhook API docs", "Explore the documented webhook integration surface."],
      ["/source-gap", "Source-gap review", "Submit a category and buyer question for review."],
      ["/contact", "Design partner", "Apply to run a founder-led real-company evidence cycle."],
      ["/compare", "Compare approaches", "See how Foremention differs from adjacent monitoring approaches."],
    ],
  },
] as const;

export default function ExplorePage() {
  return <PublicShell>
    <section className="page-hero explore-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Foremention directory</span>
        <h1>Find the right page without hunting for it.</h1>
        <p>Use this directory to move from learning to a live check, evidence review, product evaluation, or account action.</p>
        <div className="page-hero__actions">
          <Link className="button" href="/score">Run a free score <Arrow /></Link>
          <Link className="button button--outline" href="/product">See the product <Arrow /></Link>
        </div>
      </div>
    </section>

    <section className="section section--paper explore-directory" aria-label="Foremention site directory">
      <div className="shell explore-directory__grid">
        {groups.map((group) => <section className="explore-directory__group" id={group.id} key={group.id}>
          <header>
            <span className="eyebrow">{group.eyebrow}</span>
            <h2>{group.title}</h2>
          </header>
          <div className="explore-directory__links">
            {group.items.map(([href, title, description]) => <Link href={href} className="explore-directory__link" key={href}>
              <span><strong>{title}</strong><small>{description}</small></span>
              <Arrow />
            </Link>)}
          </div>
        </section>)}
      </div>
    </section>

    <section className="cta-band explore-account-cta">
      <div className="shell cta-band__inner">
        <div><span className="eyebrow">Already know where you are going?</span><h2>Enter the workspace or start a design-partner conversation.</h2></div>
        <div className="explore-account-cta__actions">
          <Link className="button button--outline" href="/login">Sign in <Arrow /></Link>
          <Link className="button button--ink button--large" href="/contact">Apply as Design Partner <Arrow /></Link>
        </div>
      </div>
    </section>
  </PublicShell>;
}
