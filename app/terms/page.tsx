import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description: "The Foremention platform terms covering accounts, customer responsibilities, AI evidence limits, integrations, plans, acceptable use, and external systems.",
  path: "/terms",
});

export default function TermsPage() {
  return <PublicShell>
    <section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Effective July 27, 2026</span><h1>Terms</h1><p>These terms set the operating boundaries for using the Foremention recommendation intelligence platform.</p></div></section>
    <article className="legal-copy shell">
      <div className="legal-summary"><strong>Plain-language summary</strong><p>Foremention provides evidence and workflow software. Customers control their questions, claims, integrations, and actions. Independent AI systems and publishers control their own outputs and decisions.</p></div>
      <h2>Agreement and account authority</h2>
      <p>By creating or using an account, you confirm that you can accept these terms for yourself or the organization you represent. You are responsible for accurate registration information, authorized users, and account security.</p>
      <h2>Platform access</h2>
      <p>Foremention provides software access for defining buyer questions, collecting connected AI-provider observations, reviewing answers, mapping public sources, evaluating reliability, organizing evidence, and tracking actions. Self-serve access may begin as a controlled free beta. Available features, providers, capacity, retention, support, and any future paid subscription terms may vary by plan or order form.</p>
      <h2>Evidence and outcome limits</h2>
      <p>AI answers are variable, probabilistic observations. Foremention does not guarantee publisher acceptance, placement, indexing, recommendation, citation, rank, traffic, leads, pipeline, or revenue. Metrics describe reviewed records within their stated collection boundary.</p>
      <h2>Acceptable use</h2>
      <p>You may not use the service for unlawful access, fabricated reviews, false identities, undisclosed promotion, harassment, malware, unreasonable automated requests, intellectual-property infringement, deceptive claims, or interference with another system or user.</p>
      <h2>Customer data and permissions</h2>
      <p>You retain rights in data you submit. You give Foremention the limited permission needed to host, process, secure, transmit, and display that data to operate and support the service. You confirm that you have authority for submitted content, connected accounts, credentials, and external claims.</p>
      <h2>Third-party services</h2>
      <p>AI providers, publishers, databases, email services, analytics systems, and payment processors are independent services. Their availability, terms, models, access rules, and outputs may change. Foremention is not responsible for a third party&apos;s independent decision or outage.</p>
      <h2>Plans, billing, and changes</h2>
      <p>Current self-serve signup does not activate a paid plan or charge a card. Price, currency, billing cadence, included capacity, renewal, cancellation, and any refund terms apply only when paid activation is explicitly available and confirmed during that activation or in an order form. Material plan changes will be communicated before they take effect.</p>
      <h2>Suspension and termination</h2>
      <p>Access may be limited or suspended to protect the service, investigate misuse, comply with law, address nonpayment when a paid agreement applies, or prevent harm. You may stop using the service and request account closure. Export and deletion windows may depend on plan, security, backup, and legal obligations.</p>
      <h2>Ownership</h2>
      <p>Foremention and its licensors retain rights in the platform, software, product design, documentation, and aggregated or de-identified learnings. These terms do not transfer ownership of customer data or third-party materials.</p>
      <h2>Service changes and availability</h2>
      <p>The service will evolve, and no uninterrupted or error-free operation is promised. Foremention will use reasonable care to protect customer records and communicate material changes, but early or unconnected features may remain unavailable until their stated dependencies are active.</p>
      <h2>Order of documents</h2>
      <p>If a signed order form or written enterprise agreement conflicts with these terms, that signed document controls for the conflicting subject. Additional legal-entity, tax, or jurisdiction details may be stated in the applicable order form.</p>
      <h2>Contact</h2>
      <p>Questions about these terms may be sent to <a href="mailto:hello@foremention.com">hello@foremention.com</a>.</p>
    </article>
  </PublicShell>;
}
