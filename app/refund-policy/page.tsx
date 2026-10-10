import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refunds and Cancellations",
  description:
    "How refunds and subscription cancellations are requested for Foremention orders processed by Paddle, including applicable buyer rights and support channels.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Payments and buyer support</span>
          <h1>Refunds and cancellations</h1>
          <p>Understand how refund requests and subscription cancellations work when your Foremention order is processed by Paddle.</p>
        </div>
      </section>
      <article className="legal-copy shell">
        <div className="legal-summary">
          <strong>Current commercial status</strong>
          <p>Foremention is validating founder-led paid plans. Self-serve payment activation is not currently enabled. This page describes the process for future transactions that are actually processed by Paddle; it does not create a paid order or change an existing agreement.</p>
        </div>

        <h2>Who handles payments and refunds?</h2>
        <p>For orders processed through Paddle, Paddle is the Merchant of Record. Paddle handles payment collection, transaction receipts, buyer payment support, and refund processing. Refund eligibility is governed by the applicable <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">Paddle Refund Policy</a>, <a href="https://www.paddle.com/legal/buyer-terms" target="_blank" rel="noreferrer">Paddle Buyer Terms</a>, and mandatory laws. Nothing on this page limits rights that cannot lawfully be excluded.</p>

        <h2>Request a refund</h2>
        <p>For a purchase processed by Paddle, use the support link in your payment confirmation email or visit <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle buyer support</a> and request a refund. Paddle reviews applicable statutory rights and any available discretionary refunds under its published policy. A request is not an automatic refund approval.</p>

        <h2>Cancel a subscription</h2>
        <p>For a subscription billed by Paddle, use the manage-subscription link in your Paddle receipt or <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle buyer support</a>. Cancellation ordinarily prevents future renewals and takes effect at the end of the current billing period, subject to the applicable buyer terms and mandatory legal rights. Cancellation and a refund of an earlier payment are separate requests.</p>

        <h2>Questions about the product or an order</h2>
        <p>For questions about Foremention plan scope, software access, or delivery, email <a href="mailto:hello@foremention.com">hello@foremention.com</a>. For payment disputes and Paddle-processed refund decisions, please use the Paddle buyer-support routes above. Do not send payment-card numbers or security codes by email.</p>

        <h2>Other arrangements</h2>
        <p>If you have a separate signed business order that is not processed by Paddle, consult the terms of that agreement for the relevant billing, cancellation, and refund process. A different payment provider may have a different buyer-support route.</p>
      </article>
    </PublicShell>
  );
}
