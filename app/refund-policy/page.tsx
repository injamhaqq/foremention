import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refunds and Cancellations",
  description:
    "Foremention's 7-day money-back guarantee, plus how refunds and subscription cancellations work for orders processed by Paddle.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="shell narrow-heading">
          <span className="eyebrow">Payments and buyer support</span>
          <h1>Refunds and cancellations</h1>
          <p>How refund requests and subscription cancellations work for Foremention subscriptions processed by Paddle.</p>
        </div>
      </section>
      <article className="legal-copy shell">
        <div className="legal-summary">
          <strong>Summary</strong>
          <p><strong>7-day money-back guarantee.</strong> If Foremention isn&apos;t right for your team, email <a href="mailto:hello@foremention.com">hello@foremention.com</a> within 7 days of your first Core or Signal payment and we will refund that payment in full. No questions asked, once per company.</p>
          <p>Foremention Core and Signal subscriptions are sold and billed by Paddle, our Merchant of Record. Paddle issues your receipt and invoice, handles refunds under its published policy, and lets you cancel at any time; cancellation stops future renewals at the end of the current billing period.</p>
        </div>

        <h2>7-day money-back guarantee</h2>
        <p>Your first payment for Core or Signal is covered for 7 days. Email <a href="mailto:hello@foremention.com">hello@foremention.com</a> from the workspace owner&apos;s address within 7 days of that payment, say you would like a refund, and we will refund it in full and cancel the subscription. You do not need to give a reason.</p>
        <ul>
          <li>The guarantee applies once per company, to its first paid subscription payment.</li>
          <li>Renewals, later upgrades, and a second subscription for the same company are not covered by the guarantee, but you can cancel at any time to stop future renewals.</li>
          <li>The free 7-day Core trial takes no card and is never charged, so it needs no refund.</li>
        </ul>
        <p>The guarantee is in addition to any rights you have under the payment terms below or under law.</p>

        <h2>Who handles payments and refunds?</h2>
        <p>For orders processed through Paddle, Paddle is the Merchant of Record. Paddle handles payment collection, transaction receipts, buyer payment support, and refund processing. Refund eligibility is governed by the applicable <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">Paddle Refund Policy</a>, <a href="https://www.paddle.com/legal/buyer-terms" target="_blank" rel="noreferrer">Paddle Buyer Terms</a>, and mandatory laws. Nothing on this page limits rights that cannot lawfully be excluded.</p>

        <h2>Request a refund</h2>
        <p>For a purchase processed by Paddle, use the support link in your payment confirmation email or visit <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle buyer support</a> and request a refund. Paddle reviews applicable statutory rights and any available discretionary refunds under its published policy. A request is not an automatic refund approval.</p>

        <h2>Cancel a subscription</h2>
        <p>Workspace owners can open the Paddle billing portal from Settings → Billing in Foremention. You can also use the manage-subscription link in your Paddle receipt or <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle buyer support</a>. Cancellation ordinarily prevents future renewals and takes effect at the end of the current billing period, subject to the applicable buyer terms and mandatory legal rights. Cancellation and a refund of an earlier payment are separate requests.</p>

        <h2>Questions about the product or an order</h2>
        <p>For questions about Foremention plan scope, software access, or delivery, email <a href="mailto:hello@foremention.com">hello@foremention.com</a>. For payment disputes and Paddle-processed refund decisions, please use the Paddle buyer-support routes above. Do not send payment-card numbers or security codes by email.</p>

        <h2>Other arrangements</h2>
        <p>If you have a separate signed business order that is not processed by Paddle, consult the terms of that agreement for the relevant billing, cancellation, and refund process. A different payment provider may have a different buyer-support route.</p>
      </article>
    </PublicShell>
  );
}
